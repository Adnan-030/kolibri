import logger from 'kolibri.lib.logging';
import { TaskResource } from 'kolibri.resources';
import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { currentLanguage } from 'kolibri.utils.i18n';
import { TaskStatuses, TaskTypes } from 'kolibri.utils.syncTaskUtils';

const logging = logger.getLogger(__filename);

function startCSVExport(store, type, creating, commitStart) {
  if (creating) {
    return;
  }
  const params = {
    facility: store.rootGetters.activeFacilityId,
    type,
  };
  return TaskResource.startTask(params).then(task => {
    store.commit(commitStart, task);
    return task.id;
  });
}

function startSummaryCSVExport(store) {
  return startCSVExport(
    store,
    TaskTypes.EXPORTSUMMARYLOGCSV,
    store.getters.inSummaryCSVCreation,
    'START_SUMMARY_CSV_EXPORT'
  );
}

function startSessionCSVExport(store) {
  return startCSVExport(
    store,
    TaskTypes.EXPORTSESSIONLOGCSV,
    store.getters.inSessionCSVCreation,
    'START_SESSION_CSV_EXPORT'
  );
}

function getExportedCSVsInfo(store) {
  return client({
    url: urls['kolibri:kolibri.plugins.facility:exportedcsvinfo'](
      store.rootGetters.activeFacilityId
    ),
  }).then(response => {
    const data = response.data;
    if (data.session != null) {
      const sessionTimeStamp = new Date(data.session * 1000);
      store.commit('SET_FINISHED_SESSION_CSV_CREATION', sessionTimeStamp);
    }
    if (data.summary != null) {
      const summaryTimeStamp = new Date(data.summary * 1000);
      store.commit('SET_FINISHED_SUMMARY_CSV_CREATION', summaryTimeStamp);
    }
    if (data.user != null) {
      const userTimeStamp = new Date(data.user * 1000);
      store.commit('SET_FINISH_EXPORT_USERS', userTimeStamp);
    }
  });
}

function checkTaskStatus(store, newTasks, taskType, taskId, commitStart, commitFinish) {
  const myNewTasks = newTasks.filter(task => {
    return task.facility_id === store.rootGetters.activeFacilityId;
  });
  // if task job has already been fetched, just continually check if its completed
  if (taskId) {
    const task = myNewTasks.find(task => task.id === taskId);

    if (task && task.status === TaskStatuses.COMPLETED) {
      if (task.type === TaskTypes.EXPORTUSERSTOCSV) {
        store.commit(commitFinish, task.extra_metadata.filename);
      } else {
        store.commit(commitFinish, new Date());
      }
      TaskResource.clear(taskId);
    }
  } else {
    const running = myNewTasks.filter(task => {
      return (
        task.type === taskType &&
        task.status !== TaskStatuses.COMPLETED &&
        task.status !== TaskStatuses.FAILED
      );
    });
    if (running.length > 0) store.commit(commitStart, running[0]);
  }
}

function startExportUsers(store) {
  if (store.getters.exportingUsers) {
    return;
  }
  return TaskResource.startTask({
    type: TaskTypes.EXPORTUSERSTOCSV,
    facility: store.rootGetters.activeFacilityId,
    locale: currentLanguage,
  }).then(task => {
    store.commit('START_EXPORT_USERS', task);
    return task.id;
  });
}

function refreshTaskList(store) {
  return Promise.all([
    TaskResource.fetchCollection({
      force: true,
    }),
  ])
    .then(([newTasks]) => {
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.EXPORTSESSIONLOGCSV,
        store.getters.sessionTaskId,
        'START_SESSION_CSV_EXPORT',
        'SET_FINISHED_SESSION_CSV_CREATION'
      );
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.EXPORTSUMMARYLOGCSV,
        store.getters.summaryTaskId,
        'START_SUMMARY_CSV_EXPORT',
        'SET_FINISHED_SUMMARY_CSV_CREATION'
      );
      checkTaskStatus(
        store,
        newTasks,
        TaskTypes.EXPORTUSERSTOCSV,
        store.state.exportUsersTaskId,
        'START_EXPORT_USERS',
        'SET_FINISH_EXPORT_USERS'
      );
    })
    .catch(error => {
      logging.error('There was an error while fetching the task list: ', error);
    });
}

export default {
  refreshTaskList,
  startSummaryCSVExport,
  startSessionCSVExport,
  getExportedCSVsInfo,
  startExportUsers,
};
