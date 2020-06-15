/*******************************************************************************
 * Copyright (c) 2020 Red Hat, Inc.
 *******************************************************************************/
"use strict";

import { getNodeDescription } from "../../../../../../src-web/components/Topology/viewer/defaults/descriptions";

const locale = "en-US";

describe("getNodeDescription internet node", () => {
  const internetNode = {
    type: "internet",
    name: "default",
    layout: {}
  };

  it("should process the node", () => {
    expect(getNodeDescription(internetNode, locale)).toEqual("default");
  });
});

describe("getNodeDescription cluster node", () => {
  const clusterNode = {
    type: "cluster",
    name: "default",
    layout: {},
    specs: {
      cluster: {
        clusterip: "192.168.1.1"
      }
    }
  };

  it("should process the node", () => {
    expect(getNodeDescription(clusterNode, locale)).toEqual("default");
  });
});

describe("getNodeDescription application node", () => {
  const applicationNode = {
    type: "application",
    name: "default",
    layout: {}
  };

  it("should process the node", () => {
    expect(getNodeDescription(applicationNode, locale)).toEqual("default");
  });
});

describe("getNodeDescription deployment node", () => {
  const deploymentNode = {
    type: "deployment",
    name: "default",
    layout: {
      hasPods: true,
      pods: [
        {
          name: "pod1"
        },
        {
          name: "pod2"
        }
      ]
    }
  };

  it("should process the node", () => {
    expect(getNodeDescription(deploymentNode, locale)).toEqual("default");
  });
});
