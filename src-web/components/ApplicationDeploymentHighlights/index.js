/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2017, 2019. All Rights Reserved.
 *
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 *******************************************************************************/

import R from 'ramda'
import React from 'react'

import { connect } from 'react-redux'
import resources from '../../../lib/shared/resources'
import { RESOURCE_TYPES } from '../../../lib/shared/constants'
import { fetchResources } from '../../actions/common'
import ApplicationDeploymentHighlightsTerminology from './ApplicationDeploymentHighlightsTerminology'

import { getSingleApplicationObject } from '../ApplicationDeploymentPipeline/components/InfoCards/utils'
import { pullOutKindPerApplication } from '../ApplicationDeploymentPipeline/utils'

/* eslint-disable react/prop-types */

resources(() => {
  require('./style.scss')
})

const mapDispatchToProps = dispatch => {
  return {
    fetchChannels: () => dispatch(fetchResources(RESOURCE_TYPES.HCM_CHANNELS))
  }
}

const mapStateToProps = state => {
  const {
    HCMChannelList,
    HCMApplicationList,
    HCMSubscriptionList,
    secondaryHeader
  } = state
  const isSingleApplicationView =
    R.pathOr([], ['breadcrumbItems'])(secondaryHeader).length == 2
  return {
    HCMChannelList,
    HCMSubscriptionList,
    HCMApplicationList,
    isSingleApplicationView
  }
}

class ApplicationDeploymentHighlights extends React.Component {
  componentWillMount() {}
  componentDidMount() {}

  componentWillUnmount() {}

  render() {
    const {
      // HCMChannelList,
      // HCMSubscriptionList,
      HCMApplicationList,
      isSingleApplicationView
    } = this.props

    let open = false
    if (isSingleApplicationView) {
      const subscriptionsArray = pullOutKindPerApplication(
        getSingleApplicationObject(HCMApplicationList),
        'subscription'
      )
      if (R.isEmpty(subscriptionsArray)) {
        open = true
      }
    } else {
      // all application view
      if (R.isEmpty(HCMApplicationList)) {
        open = true
      }
    }

    return (
      <div id="DeploymentHighlights">
        <ApplicationDeploymentHighlightsTerminology open={open} />
      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(
  ApplicationDeploymentHighlights
)
