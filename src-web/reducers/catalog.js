import * as Actions from '../actions/index'
// if term already exists in termsList, remove it. otherwise, add it.
// only works for value types, not arrays or objects.
export const addOrRemove = (termsList = [], term) => {
  return termsList.includes(term)
    ? termsList.filter(el => el !== term)
    : [...termsList, term]
}

const initialStateCatalog = {
  items: [],
  repos: [],
  selection: {
    name: '',
    url: ''
  },
  catalogFetchLoading: false,
  catalogFetchFailure: false,
  filters: {
    searchText: '',
    selectedRepos: [],
    selectedArchitectures: [], // e.g. x86
    selectedClassifications: [], // e.g. Beta
    selectedCategory: '', // e.g. 'IoT'
  },
  dropdownFiltersVisibility: false,
}

const catalog = (state = initialStateCatalog, action) => {
  switch (action.type) {
  case Actions.CATALOG_FETCH_ERROR_STATUS_CHANGE: {
    const { status = !state.catalogFetchFailure } = action.payload
    return {
      ...state,
      catalogFetchFailure: status,
    }
  }
  case Actions.CATALOG_RESOURCE_SELECT: {
    const { name, url, repoName } = action.payload
    return { ...state, selection: { name, url, repoName } }
  }
  case Actions.RESOURCES_FETCH_REQUEST_LOADING: {
    const { status = !state.catalogFetchLoading } = action.payload
    return { ...state, catalogFetchLoading: status }
  }
  case Actions.RESOURCES_FETCH_REQUEST_SUCCESS: {
    const { items } = action.payload
    return {
      ...state,
      catalogFetchFailure: false,
      items,
    }
  }
  case Actions.CATALOG_RESOURCE_FILTER_SEARCH: {
    const { searchText } = action.payload
    return {
      ...state,
      filters: { ...state.filters, searchText },
    }
  }
  case Actions.REPO_FETCH_REQUEST_SUCCESS: {
    const { repos } = action.payload
    return { ...state, repos }
  }
  case Actions.CATALOG_DROPDOWN_FILTERS_VISIBILITY_TOGGLE: {
    const { visibility } = action.payload
    const visibilityWithDefault = // if undefined or not a boolean, toggle.
        typeof visibility !== 'boolean'
          ? !state.dropdownFiltersVisibility
          : visibility
    return { ...state, dropdownFiltersVisibility: visibilityWithDefault }
  }
  default:
    return state
  }
}
export default catalog
