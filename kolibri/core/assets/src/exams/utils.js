import seededShuffle from 'seededshuffle';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import {
  ExamResource,
  ExamLogResource,
  FacilityUserResource,
  ExamAttemptLogResource,
  ContentNodeResource,
} from 'kolibri.resources';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';

/*
 * Converts from v0 exam structures to v1
 * @param {array} questionSources - array of v0 objects, which have the form:
 *    { exercise_id: <content_id>, number_of_questions: N, title: <exercise_title> }
 * @param {number} seed - an integer used to seed the PRNG
 * @param {number} numberOfQs - how many questions to return
 * @param {object} questionIds - map of `content_id`s to arrays of assessment_item_ids
 * @returns {array} - pseudo-randomized list of question objects compatible with v1 like:
 *    { contentId: content_id, itemId: assessment_item_id }
 */
function convertExamFormat(questionSources, seed, questionIds) {
  const examQuestions = questionSources.reduce(
    (acc, val) =>
      acc.concat(
        Array.from(Array(val.number_of_questions).keys()).map(assessmentItemIndex => ({
          contentId: val.exercise_id,
          title: val.title,
          assessmentItemIndex,
        }))
      ),
    []
  );
  const shuffledExamQuestions = seededShuffle.shuffle(examQuestions, seed, true);
  const shuffledExerciseQuestions = {};
  Object.keys(questionIds).forEach(key => {
    shuffledExerciseQuestions[key] = seededShuffle.shuffle(questionIds[key], seed, true);
  });
  return shuffledExamQuestions.map(question => ({
    contentId: question.contentId,
    itemId: shuffledExerciseQuestions[question.contentId][question.assessmentItemIndex],
    title: question.title,
  }));
}

// idk the best place to place this function
function getExamReport(store, examId, userId, questionNumber = 0, interactionIndex = 0) {
  return new Promise((resolve, reject) => {
    const examPromise = ExamResource.fetchModel({ id: examId });
    const examLogPromise = ExamLogResource.fetchCollection({
      getParams: {
        exam: examId,
        user: userId,
      },
    });
    const attemptLogPromise = ExamAttemptLogResource.fetchCollection({
      getParams: {
        exam: examId,
        user: userId,
      },
    });
    const userPromise = FacilityUserResource.fetchModel({ id: userId });

    ConditionalPromise.all([examPromise, examLogPromise, attemptLogPromise, userPromise]).only(
      samePageCheckGenerator(store),
      ([exam, examLogs, examAttempts, user]) => {
        const examLog = examLogs[0] || {};
        const questionSources = exam.question_sources;

        let contentPromise;

        if (questionSources.length) {
          contentPromise = ContentNodeResource.fetchCollection({
            getParams: {
              ids: questionSources.map(item => item.exercise_id),
            },
          });
        } else {
          contentPromise = ConditionalPromise.resolve([]);
        }

        contentPromise.only(
          samePageCheckGenerator(store),
          contentNodes => {
            const questionIds = {};
            contentNodes.forEach(node => {
              questionIds[node.id] = assessmentMetaDataState(node).assessmentIds;
            });
            const questions = convertExamFormat(questionSources, exam.seed, questionIds);

            // When all the Exercises are not available on the server
            if (questions.length === 0) {
              return resolve({ exam, examLog, user });
            }

            const allQuestions = questions.map((question, index) => {
              const attemptLog = examAttempts.filter(
                log => log.item === question.itemId && log.content_id === question.contentId
              );
              let examAttemptLog = attemptLog[0]
                ? attemptLog[0]
                : { interaction_history: [], correct: false, noattempt: true };
              if (attemptLog.length > 1) {
                let completionTimeStamp = attemptLog.map(function(att) {
                  return att.completion_timestamp;
                });
                examAttemptLog = attemptLog.find(
                  log => log.completion_timestamp === completionTimeStamp.sort().reverse()[0]
                );
              }
              return Object.assign(
                {
                  questionNumber: index + 1,
                },
                examAttemptLog
              );
            });

            allQuestions.sort((loga, logb) => loga.questionNumber - logb.questionNumber);

            const currentQuestion = questions[questionNumber];
            const itemId = currentQuestion.itemId;
            const exercise = contentNodes.find(node => node.id === currentQuestion.contentId);
            const currentAttempt = allQuestions[questionNumber];
            // filter out interactions without answers but keep hints and errors
            const currentInteractionHistory = currentAttempt.interaction_history.filter(
              interaction =>
                Boolean(
                  interaction.answer || interaction.type === 'hint' || interaction.type === 'error'
                )
            );
            const currentInteraction = currentInteractionHistory[interactionIndex];
            if (examLog.completion_timestamp) {
              examLog.completion_timestamp = new Date(examLog.completion_timestamp);
            }
            const payload = {
              exerciseContentNodes: [...contentNodes],
              exam,
              itemId,
              questions,
              currentQuestion,
              questionNumber: Number(questionNumber),
              currentAttempt,
              exercise,
              interactionIndex: Number(interactionIndex),
              currentInteraction,
              currentInteractionHistory,
              user,
              examAttempts: allQuestions,
              examLog,
            };
            resolve(payload);
          },
          error => reject(error)
        );
      },
      error => reject(error)
    );
  });
}

function canViewExam(exam, examLog) {
  return exam.active && !examLog.closed;
}

function canViewExamReport(exam, examLog) {
  return !canViewExam(exam, examLog);
}

export { convertExamFormat, getExamReport, canViewExam, canViewExamReport };
