/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2019. All Rights Reserved.
 * Copyright (c) 2020 Red Hat, Inc.
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/
'use strict'

import msgs from '../../../../../nls/platform.properties'
import _ from 'lodash'

const TypeFilters = {
  cluster: {
    filterTypes: {
      clusterStatuses: 'clusterStatuses',
      providers: 'providers',
      purpose: 'purpose',
      region: 'region',
      k8type: 'k8type'
    },
    searchTypes: new Set()
  },
  weave: {
    filterTypes: {
      podStatuses: 'podStatuses',
      hostIPs: 'hostIPs',
      namespaces: 'namespaces',
      labels: 'labels'
    },
    searchTypes: new Set(['podStatuses', 'labels']),
    ignored: new Set(['internet', 'host', 'cluster'])
  },
  application: {
    filterTypes: {
      podStatuses: 'podStatuses',
      hostIPs: 'hostIPs',
      namespaces: 'namespaces',
      labels: 'labels'
    },
    searchTypes: new Set(['podStatuses', 'labels'])
  },
  policy: {
    filterTypes: {
      providers: 'providers',
      purpose: 'purpose',
      region: 'region',
      k8type: 'k8type'
    },
    searchTypes: new Set()
  }
}

export const getAllFilters = (
  mode,
  typeToShapeMap,
  isLoaded,
  nodes,
  options = {},
  activeFilters,
  knownTypes,
  userIsFiltering,
  locale
) => {
  const availableFilters = {}
  let otherTypeFilters = []

  // if nothing loaded we can't calculate what types are available
  if (!nodes || nodes.length === 0) {
    return {
      availableFilters,
      otherTypeFilters,
      activeFilters
    }
  }

  /////////////// AVAIALBLE TYPE FILTERS //////////////////////
  nodes = nodes || []
  const map = nodes.map(({ type }) => type).reduce((acc, curr) => {
    if (typeof acc[curr] === 'undefined') {
      acc[curr] = 1
    } else {
      acc[curr] += 1
    }
    return acc
  }, {})
  const sorted = Object.keys(map).sort((a, b) => {
    const ret = map[b] - map[a]
    if (ret !== 0) {
      return ret
    }
    return a.localeCompare(b)
  })

  // determine what should go in main type filter bar and what should go in 'other' button
  let { availableTypes } = options
  const unknownTypes = []
  if (availableTypes) {
    // other is any type not in available types
    const set = new Set(availableTypes)
    otherTypeFilters = Object.keys(map).filter(a => {
      return !set.has(a)
    })
  } else {
    // else take 8 most popular types, and any above is other
    otherTypeFilters = []
    availableTypes = sorted
      .filter(a => {
        // anything w/o a shape is other automaically
        if (!typeToShapeMap[a]) {
          otherTypeFilters.push(a)
          unknownTypes.push(a)
          return false
        }
        return true
      })
      .filter((a, idx) => {
        if (idx > 7) {
          // then if the toolbar will be too full, put the rest in other
          otherTypeFilters.push(a)
          return false
        }
        return true
      })
      .sort()
  }

  // if lots of unknown types, assign some unknown types to spare shapes
  if (unknownTypes.length > 3 && availableTypes.length < 3) {
    const set = new Set(unknownTypes)
    sorted.filter(a => set.has(a)).some((a, idx) => {
      const spareKey = `spare${idx + 1}`
      typeToShapeMap[a] = typeToShapeMap[spareKey]
      availableTypes.push(a)
      otherTypeFilters = otherTypeFilters.filter(b => a !== b)
      delete typeToShapeMap[spareKey]
      return idx >= 5 // only 5 spares
    })
  }

  // if there are still other shapes, add to available
  if (otherTypeFilters.length > 0) {
    availableTypes = _.union(availableTypes, ['other'])
  }
  availableFilters['type'] = availableTypes

  ///////////////// ACTIVE TYPE FILTERS //////////////////////////////////////////
  const { initialActiveTypes } = options
  if (initialActiveTypes) {
    // if options specify initial active types use those in case no active types specified yet
    activeFilters = Object.assign(
      {},
      { type: initialActiveTypes },
      activeFilters
    )
  } else {
    activeFilters = _.cloneDeep(activeFilters)
    if (!userIsFiltering) {
      activeFilters.type = availableTypes
    }
  }
  // if an other type it's active status is covered by 'other' type
  if (otherTypeFilters.length > 0) {
    const set = new Set(availableTypes)
    activeFilters.type = activeFilters.type.filter(a => set.has(a))
  }

  // if using the filter view, get avaiable filters for that view
  // ex: purpose section when looking at filter view in clusters mode
  if (mode) {
    addAssortedAvailableFilters(
      mode,
      availableFilters,
      activeFilters,
      nodes,
      locale
    )
  }

  return {
    availableFilters,
    otherTypeFilters,
    activeFilters
  }
}

export const getAvailableFilters = (
  mode,
  nodes,
  options,
  activeFilters,
  locale
) => {
  const availableFilters = {}
  if (mode) {
    addAssortedAvailableFilters(
      mode,
      availableFilters,
      activeFilters,
      nodes,
      locale
    )
  }
  return availableFilters
}

//search filters also show related nodes, like searching on name
export const getSearchFilter = (mode, filters = {}) => {
  const ret = { filters: {}, search: undefined }
  const searchTypes = _.get(TypeFilters, `${mode}.searchTypes`, new Set())
  Object.entries(filters).forEach(([type, value]) => {
    if (searchTypes.has(type)) {
      if (value && value.size > 0) {
        if (!ret.search) {
          ret.search = {}
        }
        ret.search[type] = value
      }
    } else {
      ret.filters[type] = value
    }
  })
  return ret
}

/////////////////////////////// AVAILABLE FILTERS //////////////////////////////////////////
const addAssortedAvailableFilters = (
  mode,
  availableFilters,
  activeFilters,
  nodes = [],
  locale
) => {
  if (nodes.length > 0) {
    switch (mode) {
    case 'cluster':
      return addAvailableClusterFilters(availableFilters, nodes, locale)

    case 'weave':
      return addAvailableRelationshipFilters(
        mode,
        availableFilters,
        activeFilters,
        nodes,
        locale
      )

    case 'application':
      return addAvailableRelationshipFilters(
        mode,
        availableFilters,
        activeFilters,
        nodes,
        locale
      )

    case 'policy':
      return addAvailablePolicyFilters(
        availableFilters,
        activeFilters,
        nodes,
        locale
      )
    }
  }
}

const addAvailableClusterFilters = (availableFilters, nodes, locale) => {
  // initialize filter
  const filterTypes = TypeFilters['cluster'].filterTypes
  Object.keys(filterTypes).forEach(type => {
    let name
    let availableSet = new Set()
    switch (type) {
    case 'clusterStatuses':
      name = msgs.get('topology.filter.category.clusterStatuses', locale)
      availableSet = new Map([
        [
          'recent',
          msgs.get('topology.filter.category.status.recent', locale)
        ],
        [
          'offline',
          msgs.get('topology.filter.category.status.offline', locale)
        ],
        [
          'violations',
          msgs.get('topology.filter.category.status.violations', locale)
        ]
      ])
      break
    case 'providers':
      name = msgs.get('topology.filter.category.providers', locale)
      break
    case 'purpose':
      name = msgs.get('topology.filter.category.purpose', locale)
      break
    case 'region':
      name = msgs.get('topology.filter.category.region', locale)
      break
    case 'k8type':
      name = msgs.get('topology.filter.category.k8type', locale)
      break
    }
    availableFilters[type] = {
      name,
      availableSet
    }
  })

  // loop thru policies adding available filters
  nodes.forEach(({ specs }) => {
    const labels = _.get(specs, 'cluster.metadata.labels', {})
    Object.keys(filterTypes).forEach(filterType => {
      const filter = availableFilters[filterType]
      switch (filterType) {
      case 'providers':
        filter.availableSet.add(labels.cloud)
        break
      case 'purpose':
        filter.availableSet.add(labels.environment)
        break
      case 'region':
        filter.availableSet.add(labels.region)
        break
      case 'k8type':
        filter.availableSet.add(labels.vendor)
        break
      }
    })
  })
}

const addAvailableRelationshipFilters = (
  mode,
  availableFilters,
  activeFilters,
  nodes,
  locale
) => {
  // what k8 types are being shown
  const activeTypes = new Set(activeFilters.type || [])
  const ignoreNodeTypes = TypeFilters[mode].ignored || new Set()
  const filterTypes = TypeFilters[mode].filterTypes
  const showPods = activeTypes.has('pod')
  Object.keys(filterTypes).forEach(type => {
    let name = null
    let availableSet = new Set()
    switch (type) {
    case 'podStatuses':
      name =
          showPods && msgs.get('topology.filter.category.podStatuses', locale)
      availableSet = new Map([
        [
          'recent',
          msgs.get('topology.filter.category.status.recent', locale)
        ],
        [
          'restarts',
          msgs.get('topology.filter.category.status.restarts', locale)
        ],
        [
          'pending',
          msgs.get('topology.filter.category.status.pending', locale)
        ],
        ['failed', msgs.get('topology.filter.category.status.failed', locale)]
      ])
      break
    case 'hostIPs':
      name = showPods && msgs.get('topology.filter.category.hostIPs', locale)
      break
    case 'namespaces':
      name = msgs.get('topology.filter.category.namespaces', locale)
      break
    case 'labels':
      name = msgs.get('topology.filter.category.labels', locale)
      break
    }
    if (name) {
      availableFilters[type] = {
        name,
        availableSet
      }
    }
  })

  let hasPods = false
  const {
    podStatuses = new Set(),
    hostIPs = new Set(),
    namespaces = new Set()
  } = activeFilters
  nodes.forEach(node => {
    const { type, labels = [] } = node
    let { namespace } = node
    if (!ignoreNodeTypes.has(type)) {
      if (activeTypes.has(type) || activeTypes.has('other')) {
        namespace = namespace && namespace.length > 0 ? namespace : '<none>'

        // filter filters
        const podStatus = _.get(node, 'specs.podStatus')
        hasPods |= !!podStatus
        Object.keys(filterTypes).forEach(filterType => {
          const filter = availableFilters[filterType]
          if (filter) {
            switch (filterType) {
            case 'hostIPs':
              if (
                podStatus &&
                  podStatus.hostIPs.size > 0 &&
                  hasPodStatus(filterType, podStatus, podStatuses)
              ) {
                podStatus.hostIPs.forEach(ip => {
                  filter.availableSet.add(ip)
                })
              }
              break

            case 'namespaces':
              if (hasPodStatus(filterType, podStatus, podStatuses, hostIPs)) {
                filter.availableSet.add(namespace)
              }
              break

            case 'labels':
              if (
                labels &&
                  hasPodStatus(filterType, podStatus, podStatuses, hostIPs) &&
                  (namespaces.size === 0 || namespaces.has(namespace))
              ) {
                labels.forEach(({ name, value }) => {
                  filter.availableSet.add(`${name}: ${value}`)
                })
              }
              break
            }
          }
        })
      }
    }
  })

  // if no pods, remove pod filters
  if (showPods && !hasPods) {
    delete availableFilters['podStatuses']
    delete availableFilters['hostIPs']
  }
}

const hasPodStatus = (filterType, podStatus, podStatuses, hostIPs) => {
  const isFilteringPodStatus = podStatuses.size > 0
  if (podStatus) {
    // filter by pod status
    if (isFilteringPodStatus) {
      const { hasPending, hasFailure, hasRestarts, isRecent } = podStatus
      if (
        !(
          (podStatuses.has('failed') && hasFailure) ||
          (podStatuses.has('pending') && hasPending) ||
          (podStatuses.has('restarts') && hasRestarts) ||
          (podStatuses.has('recent') && isRecent)
        )
      ) {
        return false
      }
    }

    // if filtering by ip, don't show ips of nodes that don't have that ip
    const { hostIPs: hips } = podStatus
    const hasIP = (fips, ips) => {
      if (fips.size > 0) {
        if (
          !Array.from(fips).some(ip => {
            return ips.has(ip)
          })
        ) {
          return false
        }
      }
      return true
    }
    switch (filterType) {
    case 'namespaces':
    case 'labels':
      return hasIP(hostIPs, hips)
    }
    return true
  }
  return !isFilteringPodStatus
}

const addAvailablePolicyFilters = (
  availableFilters,
  activeFilters,
  nodes,
  locale
) => {
  // initialize filter
  const filterTypes = TypeFilters['policy'].filterTypes
  Object.keys(filterTypes).forEach(type => {
    let name
    const availableSet = new Set()
    switch (type) {
    case 'providers':
      name = msgs.get('topology.filter.category.providers', locale)
      break
    case 'purpose':
      name = msgs.get('topology.filter.category.purpose', locale)
      break
    case 'region':
      name = msgs.get('topology.filter.category.region', locale)
      break
    case 'k8type':
      name = msgs.get('topology.filter.category.k8type', locale)
      break
    }
    availableFilters[type] = {
      name,
      availableSet
    }
  })

  // loop thru policies adding available filters
  const activeTypes = new Set(activeFilters.type || [])
  nodes.forEach(({ type, specs }) => {
    if (type === 'cluster' && activeTypes.has(type)) {
      const labels = _.get(specs, 'cluster.metadata.labels', {})
      Object.keys(filterTypes).forEach(filterType => {
        const filter = availableFilters[filterType]
        switch (filterType) {
        case 'providers':
          filter.availableSet.add(labels.cloud)
          break
        case 'purpose':
          filter.availableSet.add(labels.environment)
          break
        case 'region':
          filter.availableSet.add(labels.region)
          break
        case 'k8type':
          filter.availableSet.add(labels.vendor)
          break
        }
      })
    }
  })
}

////////////////////////   FILTER NODES     ///////////////////////////////////

export const filterNodes = (mode, nodes, activeFilters, availableFilters) => {
  switch (mode) {
  case 'cluster':
    return filterClusterNodes(nodes, activeFilters)

  case 'weave':
    return filterRelationshipNodes(
      nodes,
      activeFilters,
      availableFilters,
      mode
    )

  case 'application':
    return filterRelationshipNodes(
      nodes,
      activeFilters,
      availableFilters,
      mode
    )

  case 'policy':
    return filterPolicyNodes(nodes, activeFilters)

  default:
    return nodes
  }
}

const filterClusterNodes = (nodes, activeFilters) => {
  const {
    clusterStatuses,
    type,
    purpose = new Set(),
    providers = new Set(),
    region = new Set(),
    k8type = new Set()
  } = activeFilters
  const typeSet = new Set(type)
  return nodes.filter(node => {
    const { type, specs } = node
    const hasType = typeSet.has(type)
    let hasClusterStatus = true
    let hasProviders = true
    let hasPurpose = true
    let hasRegion = true
    let hasK8type = true
    if (hasType && type === 'cluster') {
      // filter by cluster status
      if (clusterStatuses && clusterStatuses.size > 0) {
        const { isOffline, hasViolations, isRecent } = _.get(
          node,
          'specs.clusterStatus',
          {}
        )
        if (
          !(
            (clusterStatuses.has('offline') && isOffline) ||
            (clusterStatuses.has('violations') && hasViolations) ||
            (clusterStatuses.has('recent') && isRecent)
          )
        ) {
          hasClusterStatus = false
        }
      }

      const labels = _.get(specs, 'cluster.metadata.labels', {})
      hasProviders = providers.size === 0 || providers.has(labels.cloud)
      hasPurpose = purpose.size === 0 || purpose.has(labels.environment)
      hasRegion = region.size === 0 || region.has(labels.region)
      hasK8type = k8type.size === 0 || k8type.has(labels.vendor)
    }
    return (
      hasType &&
      hasClusterStatus &&
      hasProviders &&
      hasPurpose &&
      hasRegion &&
      hasK8type
    )
  })
}

const filterRelationshipNodes = (
  nodes,
  activeFilters,
  availableFilters,
  mode
) => {
  const {
    type,
    podStatuses = new Set(),
    hostIPs = new Set(),
    namespaces = new Set(),
    labels = new Set()
  } = activeFilters
  const activeTypeSet = new Set(type)
  const availableTypeSet = new Set(availableFilters.type)
  const includeOther = activeTypeSet.has('other')
  const ignoreNodeTypes = TypeFilters[mode].ignored || new Set()
  const alabels = [...labels]
  return nodes.filter(node => {
    const { type, namespace } = node
    let nlabels = node.labels || []

    // include type if a direct match
    // or if 'other' type is selected and this isn't an ignored type
    let hasType = activeTypeSet.has(type)
    if (
      !hasType &&
      includeOther &&
      !ignoreNodeTypes.has(type) &&
      !availableTypeSet.has(type)
    ) {
      hasType = true
    }

    // if pod status filter is on, only let pods and deployments with pods of that host ip
    let hasPodStatus = true
    if (podStatuses.size !== 0) {
      hasPodStatus = false
      const podStatus = _.get(node, 'specs.podStatus')
      if (podStatus) {
        const { hasPending, hasFailure, hasRestarts, isRecent } = podStatus
        hasPodStatus =
          (podStatuses.has('failed') && hasFailure) ||
          (podStatuses.has('pending') && hasPending) ||
          (podStatuses.has('restarts') && hasRestarts) ||
          (podStatuses.has('recent') && isRecent)
      }
    }

    // if host ips filter is on, only let pods and deployments with pods of that host ip
    let hasHostIps = true
    if (hostIPs.size !== 0) {
      hasHostIps = false
      const podStatus = _.get(node, 'specs.podStatus')
      if (podStatus) {
        const { hostIPs: hips } = podStatus
        hasHostIps = Array.from(hostIPs).some(ip => {
          return hips.has(ip)
        })
      }
    }

    // filter namespaces
    const hasNamespace =
      namespaces.size === 0 || namespaces.has(namespace || '<none>')

    // filter labels
    let hasLabel = labels.size === 0
    if (!hasLabel) {
      nlabels = nlabels.map(({ name, value }) => `${name}: ${value}`)
      hasLabel = _.difference(alabels, nlabels).length < alabels.length
    }

    return hasType && hasPodStatus && hasNamespace && hasHostIps && hasLabel
  })
}

const filterPolicyNodes = (nodes, activeFilters) => {
  const {
    type,
    purpose = new Set(),
    providers = new Set(),
    region = new Set(),
    k8type = new Set()
  } = activeFilters
  const typeSet = new Set(type)
  return nodes.filter(node => {
    const { type, specs } = node
    const hasType = typeSet.has(type)
    let hasProviders = true
    let hasPurpose = true
    let hasRegion = true
    let hasK8type = true
    if (hasType && type === 'cluster') {
      const labels = _.get(specs, 'cluster.labels', {})
      hasProviders = providers.size === 0 || providers.has(labels.cloud)
      hasPurpose = purpose.size === 0 || purpose.has(labels.environment)
      hasRegion = region.size === 0 || region.has(labels.region)
      hasK8type = k8type.size === 0 || k8type.has(labels.vendor)
    }
    return hasType && hasProviders && hasPurpose && hasRegion && hasK8type
  })
}
