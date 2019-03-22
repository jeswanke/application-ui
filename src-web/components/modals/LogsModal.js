/*******************************************************************************
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2018. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 *******************************************************************************/

'use strict'

import React from 'react'
import PropTypes from 'prop-types'
import ScrollBox from './ScrollBox'
import apolloClient from '../../../lib/client/apollo-client'
import { UPDATE_ACTION_MODAL } from '../../apollo-client/queries/StateQueries'
import { Modal, DropdownV2, Loading } from 'carbon-components-react'
import resources from '../../../lib/shared/resources'
import msgs from '../../../nls/platform.properties'
import config from '../../../lib/shared/config'

resources(() => {
  require('../../../scss/logs.scss')
})

class LogsModal extends React.PureComponent {
  constructor(props) {
    super(props)
    this.client = apolloClient.getClient()
    this.state = {
      xhrPoll: false,
      loading: true
    }
  }

  componentWillMount() {
    if (parseInt(config['featureFlags:liveUpdates']) === 2) {
      const intervalId = setInterval(this.reload.bind(this), config['featureFlags:liveUpdatesPollInterval'])
      this.setState({ intervalId: intervalId })
    }
    if (this.props.data.item !== '') {
      const { data } = this.props
      this.setState({
        loading: false,
        selectedContainer: data.containers[0].name,
        containers: data.containers,
        containerName: data.containers[0].name,
        podName: data.metadata.name,
        podNamespace: data.metadata.namespace,
        clusterName: data.cluster.metadata.name
      })
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.data !== this.props.data) {
      const { data } = nextProps
      this.setState({
        selectedContainer: data.containers[0].name,
        containers: data.containers,
        containerName: data.containers[0].name,
        podName: data.metadata.name,
        podNamespace: data.metadata.namespace,
        clusterName: data.cluster.metadata.name,
        loading: false
      })
    }
  }

  fetchLogs(containerName, podName, podNamespace, clusterName) {
    return apolloClient.getLogs(containerName, podName, podNamespace, clusterName).then(result => {
      if (result.data.logs.errors && result.data.logs.errors.length > 0){
        return result.data.logs.errors[0]
      } else {
        this.setState({
          logs: result.data.logs,
          loading: result.loading
        })
      }
    })
  }

  componentDidMount() {
    const { clusterName, containerName, loading, podName, podNamespace } = this.state
    if (!loading) {
      this.fetchLogs(containerName, podName, podNamespace, clusterName)
    }
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId)
  }

  handleClose() {
    const { type } = this.props
    this.client.mutate({
      mutation: UPDATE_ACTION_MODAL,
      variables: {
        __typename: 'actionModal',
        open: false,
        type: type,
        resourceType: {
          __typename: 'resourceType',
          name: '',
          list: ''
        },
        data: {
          __typename:'ModalData',
          item: ''
        }
      }
    })
  }

  render() {
    const { open } = this.props,
          { containers, loading, logs, podName, xhrPoll } = this.state,
          { locale } = this.context

    return (
      <Modal
        id='view-logs-modal'
        className='logs'
        open={open}
        passiveModal
        modalLabel='Pod'
        modalHeading={podName}
        primaryButtonDisabled
        onRequestClose={this.handleClose.bind(this)}
        role='region'
        aria-label='logs'>
        <div className='logs-container'>
          <div className='logs-container__actions'>
            <div className='dropdown-container'>
              <DropdownV2
                ariaLabel={msgs.get('dropdown.pod.label', locale)}
                label={containers ? containers[0].name : ''}
                onChange={this.handleContainerChange.bind(this)}
                items={containers ? containers.map((container, index) => ({ id: `${container.name}-${index}`, label: container.name, value: container.name})) : []} />
            </div>
          </div>

          {(() => {
            if (!xhrPoll && loading) {
              return <Loading withOverlay={false} className='content-spinner' />
            }
            return <ScrollBox className='logs-container__content' content={logs} />
          })()}
        </div>
      </Modal>
    )
  }

  handleContainerChange(data) {
    const containerName = data.selectedItem.label
    const { loading } = this.state
    this.setState({
      xhrPoll: false,
      selectedContainer: containerName,
    })
    if (!loading) {
      const { podName, podNamespace, clusterName } = this.state
      this.fetchLogs(containerName, podName, podNamespace, clusterName)
    }
  }

  reload() {
    const { clusterName, loading, podName, podNamespace, selectedContainer } = this.state
    if (!loading) {
      this.setState({ xhrPoll: true })
      this.fetchLogs(selectedContainer, podName, podNamespace, clusterName)
    }
  }
}

LogsModal.contextTypes = {
  locale: PropTypes.string
}

LogsModal.propTypes = {
  data: PropTypes.object,
  open: PropTypes.bool,
  type: PropTypes.string
}

export default LogsModal
