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
import explain from '../utils/hive-explainer';
import fullscreen from 'em-tgraph/utils/fullscreen';

export default Ember.Component.extend({

  visualExplainJson:'',

  showDetailsModal: false,

  classNames:['visual-explain-container'],

  explainDetailData: '',

  vectorizedInfo: null,
  store: Ember.inject.service(),

  draggable: Ember.Object.create(),

  visualExplainInput: Ember.computed('visualExplainJson', function () {
    return this.get('visualExplainJson');
  }),
  containerid: '#explain-container',
  isQueryRunning:false,

  didInsertElement() {
    this._super(...arguments);
    const explainData = JSON.parse(this.get('visualExplainInput'));
    const onRequestDetail = (data, vectorized) => {
      this.set('explainDetailData', JSON.stringify( data, null, '  ') );
      this.set('vectorizedInfo', vectorized['Execution mode:']);
    };
    // if(explainData) {
      let id = this.get('planId')?'#'+this.get('planId'):'#explain-container';
      this.set('containerid', id);
      let currentWorksheet = this.get('store').peekAll('worksheet').filterBy('selected', true).get('firstObject');
      explain(explainData, id, onRequestDetail, this.get('draggable'), currentWorksheet);
    // }

  },

  click(){
    if(this.get('explainDetailData') === '' || this.get('draggable').get('zoom') ){
      return;
    }

    Ember.run.later(() => {
      this.set('showDetailsModal', true);
    }, 100);
    this.get('draggable').set('zoom', false);
    this.get('draggable').set('dragstart', false);
    this.get('draggable').set('dragend', false);
  },

  actions:{
    expandQueryResultPanel(){
      var swimlaneElement = Ember.$(this.containerid).parent(".visual-explain-container").get(0);
      if(Ember.$('#explain-container').children().length === 0) {
        Ember.$('#explain-container').remove();
      }
      if(swimlaneElement){
        fullscreen.toggle(swimlaneElement);
      }
      //this.sendAction('expandQueryResultPanel');
      Ember.$(".visual-explain-container #explain-container svg").css("height", "100%");
    },

    closeModal(){
      this.set('showDetailsModal', false);
      this.set('explainDetailData', '');
      this.set('vectorizedInfo', '');
      return false;
    }

  }

});

