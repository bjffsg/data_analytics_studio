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
import ENV from '../config/environment';

const BREADCRUMB_PREFIX = [];

export default Ember.Controller.extend({
  breadcrumbs: null,
  appError: null,

  loadTime: null,

  tabs: [{
    text: "Hive Queries",
    routeName: "hive-queries",
    subRoutes: ["app", "query", "dag", "vertex", "task", "attempt"]
  }, {
    text: "Hive IDE",
    routeName: "queries"
  }, {
    text: "Reports",
    routeName: "reports"
  }],

  // Temporary hack till all pages move into a design with darker bg
  useDarkBg: Ember.computed("currentPath", function () {
    return this.get("currentPath") == 'hive-queries';
  }),

  prefixedBreadcrumbs: Ember.computed("breadcrumbs", function () {
    var prefix = BREADCRUMB_PREFIX,
    breadcrumbs = this.get('breadcrumbs');

    if(Array.isArray(breadcrumbs)) {
      prefix = prefix.concat(breadcrumbs);
    }

    return prefix;
  }),

  serviceCheck: Ember.inject.service(),
  ldapAuth: Ember.inject.service(),

  serviceCheckCompleted: Ember.computed('serviceCheck.transitionToApplication', 'ldapAuth.passwordRequired', function() {
    if(this.get('ldapAuth.passwordRequired'))
      return false;
    return !ENV.APP.SHOULD_PERFORM_SERVICE_CHECK || this.get('serviceCheck.transitionToApplication');
  })
});
