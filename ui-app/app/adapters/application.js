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
import DS from 'ember-data';
import ENV from '../config/environment';
import commons from '../mixins/commons';

export default DS.RESTAdapter.extend(commons, {
  ldapAuth: Ember.inject.service(),

  init: function () {
    Ember.$.ajaxSetup({
      cache: false,
      headers: { 'X-Requested-By': 'das'}
    });

    Ember.$.ajaxPrefilter(function(options, oriOpt, jqXHR) {
      jqXHR.setRequestHeader('X-Requested-By', 'das');
    });
  },

  namespace: Ember.computed(function () {
    return 'api';
  }),

  headers: Ember.computed(function () {
    let headers = {
      'X-Requested-By': 'das',
      'Content-Type': 'application/json'
    };

    if (ENV.environment === 'development') {
      // In development mode when the UI is served using ember serve the xhr requests are proxied to ambari server
      // by setting the proxyurl parameter in ember serve and for ambari to authenticate the requests, it needs this
      // basic authorization. This is for default admin/admin username/password combination.
      //headers['Authorization'] = 'Basic YWRtaW46YWRtaW4=';
      //headers['Authorization'] = 'Basic aGl2ZTpoaXZl';
      //headers['Authorization'] = 'Basic ZGlwYXlhbjpkaXBheWFu';
    }
    return headers;
  }),


  handleResponse(status, headers, payload, requestData) {
    if (status == 401) {
      this.get('ldapAuth').askPassword();
    }
    return this._super(...arguments);
  },

  parseErrorResponse(responseText) {
    this.logErrorMessagesToGA(responseText);

    let json = this._super(responseText);
    if (Ember.isEmpty(json.errors)) {
      let error = {};
      error.message = json.message;
      error.trace = json.trace;
      error.status = json.status;

      delete json.trace;
      delete json.status;
      delete json.message;

      json.errors = error;
      //return json;

    }

    return responseText;
  }
});
