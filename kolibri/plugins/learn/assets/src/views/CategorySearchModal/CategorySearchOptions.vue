<template>

  <div>
    <h2 class="top-category">
      <KButton
        :text="coreString(camelCase(selectedCategory))"
        :appearanceOverrides="appearanceOverrides"
        appearance="basic-link"
        :disabled="availablePaths && !availablePaths[topLevelCategory.value]"
        @click="$emit('input', topLevelCategory.value)"
      />
    </h2>
    <KGrid
      :style="{ margin: '24px' }"
    >
      <KGridItem
        v-for="(nestedObject, key) in displaySelectedCategories"
        :key="key"
        :layout4="{ span: 4 }"
        :layout8="{ span: 8 }"
        :layout12="{ span: 4 }"
        class="category-item"
      >
        <div class="filter-list-title">
          <KIcon
            :icon="icon(key)"
            size="large"
          />
          <h3>
            <KButton
              :text="coreString(camelCase(key))"
              appearance="basic-link"
              class="larger-text"
              :appearanceOverrides="appearanceOverrides"
              :disabled="availablePaths && !availablePaths[nestedObject.value]"
              @click="$emit('input', nestedObject.value)"
            />
          </h3>

        </div>
        <div
          v-for="(item, nestedKey) in nestedObject.nested"
          :key="item.value"
        >
          <KButton
            :text="coreString(camelCase(nestedKey))"
            :appearanceOverrides="appearanceOverrides"
            appearance="basic-link"
            :disabled="availablePaths && !availablePaths[nestedObject.value]"
            @click="$emit('input', item.value)"
          />
        </div>
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { injectSearch } from '../../composables/useSearch';

  export default {
    name: 'CategorySearchOptions',
    mixins: [commonCoreStrings, responsiveWindowMixin],
    setup() {
      const { availableLibraryCategories, searchableLabels } = injectSearch();
      return {
        availableLibraryCategories,
        searchableLabels,
      };
    },
    props: {
      selectedCategory: {
        type: String,
        required: true,
        default: null,
      },
    },
    computed: {
      availablePaths() {
        if (this.searchableLabels) {
          const paths = {};
          for (let key of this.searchableLabels.categories) {
            const keyPaths = key.split('.');
            let path = '';
            for (let keyPath of keyPaths) {
              path = path === '' ? keyPath : path + '.' + keyPath;
              paths[path] = true;
            }
          }
          return paths;
        }
        return null;
      },
      topLevelCategory() {
        return this.availableLibraryCategories[this.selectedCategory];
      },
      displaySelectedCategories() {
        return this.availableLibraryCategories[this.selectedCategory].nested;
      },
      appearanceOverrides() {
        return {
          color: this.$themeTokens.text,
          marginTop: '8px',
        };
      },
    },
    methods: {
      camelCase(val) {
        return camelCase(val);
      },
      icon(key) {
        // 'language' icon is already in use and it doesn't follow the
        // same naming pattern for category resources, so set separate
        // case to return the correct icon
        if (camelCase(key) === 'languageLearning') {
          return 'language';
        } else if (
          camelCase(key) === 'technicalAndVocationalTraining' ||
          camelCase(key) === 'professionalSkills'
        ) {
          // similarly, 'skills' icon is used for both of these resources
          // and doesn't follow same pattern
          return 'skillsResource';
        } else if (camelCase(key) === 'foundationsLogicAndCriticalThinking') {
          // naming mismatch
          return 'logicCriticalThinkingResource';
        } else {
          return `${camelCase(key)}Resource`;
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .top-category {
    margin-right: 16px;
    margin-bottom: 4px;
    margin-left: 16px;
    font-size: 24px;
  }

  .larger-text {
    margin-top: 4px;
    margin-bottom: 4px;
    font-size: 20px;
  }

  /deep/ .link-text {
    text-decoration: none !important;
    transition: none !important;
  }

  .category-item {
    margin-bottom: 32px;
  }

  h3 {
    margin-top: 0;
    margin-bottom: 8px;
  }

  /deep/ svg {
    width: 2.5em;
    height: 2.5em;
  }

</style>
