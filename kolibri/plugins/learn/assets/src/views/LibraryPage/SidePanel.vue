<template>

  <!-- This v-if ensures we don't render an unnecessary empty div
    something will always be showing if one of these is true
  -->
  <div
    v-if="windowIsLarge || mobileSidePanelIsOpen"
  >
    <!-- Embedded Side panel is on larger views, and exists next to content -->
    <SearchFiltersPanel
      v-if="windowIsLarge"
      :value="searchTerms"
      data-test="desktop-search-side-panel"
      :width="`${sidePanelWidth}px`"
      position="embedded"
      @input="val => $emit('setSearchTerms', val)"
      @currentCategory="handleCategory"
    />
    <!-- The full screen side panel is used on smaller screens, and toggles as an overlay -->
    <!-- FullScreen is a container component, and then the SearchFiltersPanel sits within -->
    <SidePanelModal
      v-else-if="mobileSidePanelIsOpen"
      class="full-screen-side-panel"
      data-test="filters-side-panel"
      alignment="left"
      :sidePanelOverrideWidth="`${sidePanelOverlayWidth}px`"
      :closeButtonIconType="closeButtonIcon"
      @closePanel="$emit('toggleMobileSidePanel')"
      @shouldFocusFirstEl="findFirstEl()"
    >
      <KIconButton
        v-if="(windowIsSmall || windowIsMedium) && currentCategory"
        icon="back"
        :ariaLabel="coreString('goBackAction')"
        :color="$themeTokens.text"
        :tooltip="coreString('goBackAction')"
        @click="closeCategoryModal"
      />
      <SearchFiltersPanel
        v-if="!currentCategory"
        ref="embeddedPanel"
        :value="searchTerms"
        :width="`${sidePanelOverlayWidth}px`"
        position="overlay"
        @input="val => $emit('setSearchTerms', val)"
        @currentCategory="handleCategory"
      />
      <CategorySearchModal
        v-if="currentCategory && (windowIsSmall || windowIsMedium)"
        ref="searchModal"
        :selectedCategory="currentCategory"
        :numCols="numCols"
        position="fullscreen"
        @cancel="currentCategory = null"
        @input="category => $emit('setCategory', category)"
      />
    </SidePanelModal>

    <!-- Category Search modal for large screens. On smaller screens, it is -->
    <!-- contained within the full screen search modal (different design) -->
    <CategorySearchModal
      v-if="windowIsLarge && currentCategory"
      ref="searchModal"
      :selectedCategory="currentCategory"
      :numCols="numCols"
      position="modal"
      @cancel="currentCategory = null"
      @input="category => $emit('setCategory', category)"
    />
  </div>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import SidePanelModal from '../SidePanelModal';
  import CategorySearchModal from '../CategorySearchModal';
  import SearchFiltersPanel from '../SearchFiltersPanel';
  import commonLearnStrings from './../commonLearnStrings';

  export default {
    name: 'SidePanel',
    components: {
      CategorySearchModal,
      SearchFiltersPanel,
      SidePanelModal,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    /* eslint-disable-next-line no-unused-vars */
    setup(props, context) {
      var currentCategory = ref(null);
      const closeCategoryModal = () => (currentCategory.value = null);
      const handleCategory = category => {
        currentCategory.value = category;
      };

      const embeddedPanel = ref(null);
      const searchModal = ref(null);

      // focusFirstEl is a public method on both of these refs' components
      const findFirstEl = () => {
        if (embeddedPanel) {
          embeddedPanel.value.focusFirstEl();
        } else {
          searchModal.value.focusFirstEl();
        }
      };

      const {
        windowBreakpoint,
        windowIsLarge,
        windowIsMedium,
        windowIsSmall,
      } = useKResponsiveWindow();

      return {
        closeCategoryModal,
        currentCategory,
        embeddedPanel,
        searchModal,
        findFirstEl,
        handleCategory,
        windowBreakpoint,
        windowIsLarge,
        windowIsMedium,
        windowIsSmall,
      };
    },
    props: {
      mobileSidePanelIsOpen: {
        type: Boolean,
        default: false,
      },
      searchTerms: {
        type: Object,
        default: () => {},
      },
    },
    computed: {
      closeButtonIcon() {
        return (this.windowIsSmall || this.windowIsMedium) && this.currentCategory
          ? 'back'
          : 'close';
      },
      sidePanelWidth() {
        if (this.windowIsSmall || this.windowIsMedium) {
          return 0;
        } else if (this.windowBreakpoint < 4) {
          return 234;
        } else {
          return 346;
        }
      },
      sidePanelOverlayWidth() {
        if (!this.windowIsSmall) {
          return 364;
        }
        return null;
      },
    },
    watch: {
      searchTerms(val) {
        this.$emit('searchTerms', val);
      },
    },
  };

</script>
