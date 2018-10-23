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

import MultiTableController from '../multi-table';
import ColumnDefinition from 'em-table/utils/column-definition';

export default MultiTableController.extend({
  breadcrumbs: [{
    text: "All Vertices",
    routeName: "dag.vertices",
  }],

  columns: ColumnDefinition.make([{
    id: 'name',
    headerTitle: 'Vertex Name',
    contentPath: 'name',
    cellComponentName: 'em-table-linked-cell',
    getCellContent: function (row) {
      return {
        routeName: "vertex",
        model: row.get("entityID"),
        text: row.get("name")
      };
    }
  },{
    id: 'entityID',
    headerTitle: 'Vertex Id',
    contentPath: 'entityID'
  },{
    id: 'status',
    headerTitle: 'Status',
    contentPath: 'finalStatus',
    cellComponentName: 'em-table-status-cell',
    observePath: true
  },{
    id: 'progress',
    headerTitle: 'Progress',
    contentPath: 'progress',
    cellComponentName: 'em-table-progress-cell',
    observePath: true
  },{
    id: 'startTime',
    headerTitle: 'Start Time',
    contentPath: 'startTime',
    cellComponentName: 'date-formatter',
  },{
    id: 'endTime',
    headerTitle: 'End Time',
    contentPath: 'endTime',
    cellComponentName: 'date-formatter',
  },{
    id: 'duration',
    headerTitle: 'Duration',
    contentPath: 'duration',
    cellDefinition: {
      type: 'duration'
    }
  },{
    id: 'firstTaskStartTime',
    headerTitle: 'First Task Start Time',
    contentPath: 'firstTaskStartTime',
    cellComponentName: 'date-formatter',
  },{
    id: 'totalTasks',
    headerTitle: 'Tasks',
    contentPath: 'totalTasks',
  },{
    id: 'succeededTasks',
    headerTitle: 'Succeeded Tasks',
    contentPath: 'succeededTasks',
    observePath: true
  },{
    id: 'runningTasks',
    headerTitle: 'Running Tasks',
    contentPath: 'runningTasks',
    observePath: true
  },{
    id: 'pendingTasks',
    headerTitle: 'Pending Tasks',
    contentPath: 'pendingTasks',
    observePath: true
  },{
    id: 'processorClassName',
    headerTitle: 'Processor Class',
    contentPath: 'processorClassName',
  }]),

  beforeSort: function (columnDefinition) {
    if(this._super(columnDefinition)) {
      if(this.get("polling.isReady")) {
        let columnName = columnDefinition.get("headerTitle");
        switch(columnDefinition.get("contentPath")) {
          case "succeededTasks":
          case "runningTasks":
          case "pendingTasks":
            this.send("openModal", {
              title: "Cannot sort!",
              content: `Sorting on ${columnName} is disabled for running DAGs while Auto Refresh is enabled!`
            });
            return false;
        }
      }
    }
    return true;
  }

});
