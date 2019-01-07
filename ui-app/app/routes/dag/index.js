/*
 *
 * HORTONWORKS DATAPLANE SERVICE AND ITS CONSTITUENT SERVICES
 *
 * (c) 2016-2018 Hortonworks, Inc. All rights reserved.
 *
 * This code is provided to you pursuant to your written agreement with Hortonworks, which may be the terms of the
 * Affero General Public License version 3 (AGPLv3), or pursuant to a written agreement with a third party authorized
 * to distribute this code.  If you do not have a written agreement with Hortonworks or with an authorized and
 * properly licensed third party, you do not have any rights to this code.
 *
 * If this code is provided to you under the terms of the AGPLv3:
 * (A) HORTONWORKS PROVIDES THIS CODE TO YOU WITHOUT WARRANTIES OF ANY KIND;
 * (B) HORTONWORKS DISCLAIMS ANY AND ALL EXPRESS AND IMPLIED WARRANTIES WITH RESPECT TO THIS CODE, INCLUDING BUT NOT
 *   LIMITED TO IMPLIED WARRANTIES OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE;
 * (C) HORTONWORKS IS NOT LIABLE TO YOU, AND WILL NOT DEFEND, INDEMNIFY, OR HOLD YOU HARMLESS FOR ANY CLAIMS ARISING
 *   FROM OR RELATED TO THE CODE; AND
 * (D) WITH RESPECT TO YOUR EXERCISE OF ANY RIGHTS GRANTED TO YOU FOR THE CODE, HORTONWORKS IS NOT LIABLE FOR ANY
 *   DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE OR CONSEQUENTIAL DAMAGES INCLUDING, BUT NOT LIMITED TO,
 *   DAMAGES RELATED TO LOST REVENUE, LOST PROFITS, LOSS OF INCOME, LOSS OF BUSINESS ADVANTAGE OR UNAVAILABILITY,
 *   OR LOSS OR CORRUPTION OF DATA.
 *
 */

import Ember from 'ember';
import SingleAmPollsterRoute from '../single-am-pollster';

import downloadDAGZip from '../../utils/download-dag-zip';

export default SingleAmPollsterRoute.extend({
  title: "DAG Details",

  loaderNamespace: "dag",

  setupController: function (controller, model) {
    this._super(controller, model);
    Ember.run.later(this, "startCrumbBubble");
  },

  load: function (value, query, options) {
    options = Ember.$.extend({
      demandNeeds: ["info"]
    }, options);
    return this.get("loader").queryRecord('dag', this.modelFor("dag").get("id"), options);
  },

  getCallerInfo: function (dag) {
    var dagName = dag.get("name") || "",
        callerType = dag.get("callerType"),
        callerID = dag.get("callerID");

    if(!callerID || !callerType) {
      let hiveQueryID = dagName.substr(0, dagName.indexOf(":"));
      if(hiveQueryID && dagName !== hiveQueryID) {
        callerType = "HIVE_QUERY_ID";
        callerID = hiveQueryID;
      }
    }

    return {
      type: callerType,
      id: callerID
    };
  },

  actions: {
    downloadDagJson: function () {
      var dag = this.get("loadedValue"),
          downloader = downloadDAGZip(dag, {
            batchSize: 500,
            timelineHost: this.get("hosts.timeline"),
            timelineNamespace: this.get("env.app.namespaces.webService.timeline"),
            callerInfo: this.getCallerInfo(dag)
          }),
          modalContent = Ember.Object.create({
            dag: dag,
            downloader: downloader
          });

      this.send("openModal", "zip-download-modal", {
        title: "Download data",
        content: modalContent
      });
    }
  }

});
