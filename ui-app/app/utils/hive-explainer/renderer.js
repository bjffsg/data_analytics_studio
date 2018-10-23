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

export default function doRender(data, selector, onRequestDetail, draggable, query) {

  const width = '100%', height = '400';
  var zoomInit = null;
  d3.select(selector).select('*').remove();
  var isSingleReducer = isSingleReducerAvailable(data);

  const svg =
    d3.select(selector)
      .append('svg')
        .attr('width', width)
        .attr('height', height);

  const container = svg.append('g');

  const queryTxt = query?query.get('query'):"";
  const isWhereClausePresent = queryTxt.toLowerCase().indexOf('where') > -1;
  d3.selectAll('button').on('click', function() {
    if (this.id === 'zoom_in') {
      transition(1.2); // increase on 0.2 each time
    }
    if (this.id === 'zoom_out') {
      transition(0.8); // deacrease on 0.2 each time
    }
  });

  function transition(zoomLevel) {
    zoomInit = zoomInit || 1;
    let newScale = parseFloat(zoomInit*zoomLevel).toFixed(5) ;

    if(newScale < 0.2){
      newScale = 0.2;
    }else {
      newScale = newScale;
    }

    zoomInit = newScale;

    container.transition()
      .duration(100)
      .attr("transform", "translate(" + zoom.translate()[0] + "," + zoom.translate()[1] +")scale(" + newScale + ")");
  }

  const zoom = d3.behavior.zoom()
      .scale(zoomInit)
      .on('zoom', zoomed );

  function zoomed() {
    var presentScale = d3.transform(container[0][0].getAttribute('transform')).scale[0] || d3.event.scale ;
    container.attr('transform', 'translate(' + d3.event.translate + ') scale(' + presentScale + ')');
    draggable.set('zoom' , true);
  };

  var currentTransform = null;

  const drag = d3.behavior.drag()
    .on("dragstart", (event) => {
      draggable.set('dragstart', true);
      draggable.set('zoom',false);

      let evt = window.event || event;
      currentTransform = d3.transform(evt.currentTarget.firstElementChild.getAttribute('transform'));
    })
    .on("dragend", () => {
      draggable.set('dragend', true);

      var latestTransformation = d3.transform(container[0][0].getAttribute('transform'));
      container.transition()
        .duration(100)
        .attr("transform", "translate(" + latestTransformation.translate[0] + "," + latestTransformation.translate[1] +")scale(" + currentTransform.scale[0] + ")");
    });

    svg
      .call(zoom)
      .call(drag);

    svg
      .on("mousewheel.zoom", null)
      .on("DOMMouseScroll.zoom", null) // disables older versions of Firefox
      .on("wheel.zoom", null) // disables newer versions of Firefox

  const root =
    container
      .selectAll('g.vertex')
        .data([data.tree])
      .enter()
        .append('g')
      .attr('class', 'vertex')
      .attr('data-vertex', d => d._vertex);

  root
    .call(recurseC, onRequestDetail, isSingleReducer);

  root
    .call(recurseV, onRequestDetail, isSingleReducer);

  container.selectAll('path.edge')
    .data(data.connections)
    .enter()
      .insert('path', ':first-child')
    .attr('class', 'edge')
    .attr('d', d => (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) ? getConnectionPathFF(d, svg, container, data, isWhereClausePresent) : getConnectionPath(d, svg, container, data));
  //if(navigator.userAgent.toLowerCase().indexOf('firefox') === -1) {
    root.selectAll('path.arrow')
      .data(data.connections)
      .enter()
      .insert('path')
      .attr('class', 'arrow')
      .style("stroke-width", function(d) { return Math.sqrt(d.value); })
      .attr('d', d => navigator.userAgent.toLowerCase().indexOf('firefox') === -1?getConnectionPathArrow(d, svg, container, data, isWhereClausePresent):getConnectionPathFFArrow(d, svg, container, data, isWhereClausePresent));
  //}

  reset(zoom, svg, container, data);

}
function isSingleReducerAvailable(data){
  let reducerCount = data.verticesData.filter(function(item){
    return item['_vertex'].indexOf("Reducer") === 0;
  });
  if(reducerCount && reducerCount.length === 1) {
    return true;
  }
  return false;
}
function recurseV(vertices, onRequestDetail, isSingleReducer) {
  vertices.each(function(cVertx) {
    const vertex = d3.select(this);

    const vertices =
      vertex
        .selectAll('g.vertex')
          .data(d => d._vertices)
        .enter()
          .append('g')
        .attr('class', 'vertex')
        .attr('data-vertex', d => d._vertex)
        .style('transform', d => `translate(${d._widthOfSelf * 200}px, ${d._offsetY * 100}px)`);

      vertices
        .call(recurseC, onRequestDetail, isSingleReducer);

      vertices
        .call(recurseV, onRequestDetail, isSingleReducer);
  });
}

function recurseC(children, onRequestDetail, isSingleReducer) {
  children.each(function(d) {
    const child = d3.select(this);

    const children =
      child
          .selectAll('g.child')
        .data(d => d._children || []).enter()
          .append('g')
          .attr('class', 'child')
          .style('transform', (d, index) => `translate(-${200}px, ${index * 100}px)`);

      children
          .append('rect')
        .attr('id', d => d._uuid)
        .attr('data-operator', d => d._operator)
        .attr('class', d => `operator__box operator__box--${d._operator.toString().replace(/[ ]/g, '_')}`)
        .attr('height', d => d._operator === 'Fetch Operator' ? 55 : 55)
        .attr('width', 140);

      children
          .append('foreignObject')
        .attr('data-uuid', d => d._uuid)
        .attr('data-operator', d => d._operator)
        .attr('class', d => `operator operator--${d._operator.toString().replace(/[ ]/g, '_')}`)
        .attr('height', d => d._operator === 'Fetch Operator' ? 55 : 55)
        .attr('width', 140)
        .append('xhtml:div')
        .style('height', d => d._operator === 'Fetch Operator' ? '55px' : 'auto')
        .style('margin', 0 )
          .html(d => getRenderer(d._operator, isSingleReducer)(d))
        .on('click', d => {
          var classNames = $("[uniqueid=visualexp-selected]").attr("class");
          if(classNames){
            classNames = classNames.replace("visualexp-selected", "");
            $("[uniqueid=visualexp-selected]").attr('class', classNames);
            $("[uniqueid=visualexp-selected]").attr('uniqueid', "");
          }
          classNames = $("rect#"+d._uuid).attr("class");
          $("rect#"+d._uuid).attr("class", classNames+" visualexp-selected");
          $("rect#"+d._uuid).attr("uniqueId", "visualexp-selected");
          const vertex = d3.select(Ember.$(d3.select(this).node()).closest('.vertex').get(0)).data()[0];
          onRequestDetail(doClean(d), vertex);

        });

      children
        .call(recurseC, onRequestDetail, isSingleReducer);
    });
}

function getRenderer(type, isSingleReducer) {
  if(type === 'Fetch Operator') {
    return (d => {
      return (`
        <div style='display:flex;align-items: center;'>
          <div class='operator-meta'>
            <i class='fa ${getOperatorIcon(d._operator)}' aria-hidden='true'></i>
          </div>
          <div class='operator-body' style='margin-left: 10px;'>
            <div class="ellipsis-node" title="${getOperatorLabel(d, isSingleReducer)}">${getOperatorLabel(d, isSingleReducer)}</div>
            ${(d['limit:'] && d['limit:'] > -1) ? '<div><span class="operator-limit">Limit:</span> ' + d['limit:'] + ' </div>' : ''}
          </div>
        </div>
      `);
    });
  }

  return (d => {
    const stats = d['Statistics:'] ?  `<div><span class='operator-limit'>Rows:</span> ${abbreviate(getNumberOfRows(d['Statistics:']))}</div>` : '';
    return (`
      <div style='display:flex;'>
        <div class='operator-meta'>
          <i class='fa ${getOperatorIcon(d._operator)}' aria-hidden='true'></i>
        </div>
        <div class='operator-body' style='margin-left: 10px;'>
          <div class="ellipsis-node" title="${getOperatorLabel(d, isSingleReducer)}">${getOperatorLabel(d, isSingleReducer)}</div>
          ${stats}
        </div>
      </div>
    `);
  });

}

function getNumberOfRows(statistics) {
  const match = statistics.match(/([^\?]*)\Num rows: (\d*)/);
  return (match.length === 3 && Number.isNaN(Number(match[2])) === false) ? match[2] : 0;
}
function getOperatorLabel(d, isSingleReducer) {
  const operator = d._operator;
  if(operator === 'Partition/Sort Pseudo-Edge' && isSingleReducer) {
    return "Sort";
  }
  if(operator === 'TableScan') {
    return d['alias:'];
  }

  const operatorStr = operator.toString();

  if(operatorStr.indexOf('Map Join Operator') > -1) {
    return "Hash Join";
  }
  if(operatorStr.endsWith(' Operator')) {
    return operatorStr.substring(0, operatorStr.length - ' Operator'.length);
  }
  if(operatorStr.endsWith(' Pseudo-Edge')) {
    return operatorStr.substring(0, operatorStr.length - ' Pseudo-Edge'.length);
  }
  return operatorStr ? operatorStr : 'Unknown';
}
function getOperatorIcon(operator) {
  switch(operator) {
    case 'File Output Operator':
      return 'fa-file-o';
    case 'Partition/Sort Pseudo-Edge':
    case 'Broadcast Pseudo-Edge':
    case 'Partition Pseudo-Edge':
    case 'Co-partition Pseudo-Edge':
    case 'Cross-product Distribute Pseudo-Edge':
    case 'Reduce Output Operator':
      return 'fa-compress';
    case 'Filter Operator':
      return 'fa-filter';
    case 'Dynamic Partitioning Event Operator':
      return 'fa-columns';
    case 'Map Join Operator':
      return 'fa-code-fork';
    case 'Limit':
    case 'Group By Operator':
    case 'Select Operator':
    case 'TableScan':
    case 'Fetch Operator':
      return 'fa-table';
    default:
      return '';
  }
}
function getIcon (type, subtype) {
  switch(type) {
    case 'join':
      return 'fa-code-fork';
    case 'vectorization':
    case 'job':
      return;
    case 'broadcast':
    case 'partition-sort':
      return 'fa-compress';
    case 'source':
    case 'sink':
    case 'group-by':
    case 'select':
      return 'fa-table';
  }
}

function abbreviate(value) {
  let newValue = value;
  if (value >= 1000) {
    const suffixes = ["", "k", "m", "b","t"];
    const suffixNum = Math.floor(("" + value).length / 3);
    let shortValue = '';
    for (var precision = 2; precision >= 1; precision--) {
      shortValue = parseFloat( (suffixNum !== 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
      const dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
      if (dotLessShortValue.length <= 2) { break; }
    }
    if (shortValue % 1 !== 0) {
      const  shortNum = shortValue.toFixed(1);
    }
    newValue = shortValue+suffixes[suffixNum];
  }
  return newValue;
}
function reset(zoom, svg, container, data) {
  const vertices = container.selectAll('g.vertex');
  const bounds = [];
  vertices.each(function(d) {
    const cVertex = d3.select(this);
    const box = cVertex.node().getBoundingClientRect();
    bounds.push(box);
  });
  const PADDING_PERCENT = 0.95;
  const svgRect = svg.node().getBoundingClientRect();
  const fullWidth = svgRect.width;
  const fullHeight = svgRect.height;
  const offsetY = svgRect.top;
  const top = Math.min(...bounds.map(cBound => cBound.top));
  const left = Math.min(...bounds.map(cBound => cBound.left));
  const width = Math.max(...bounds.map(cBound => cBound.right)) - left;
  const height = Math.max(...bounds.map(cBound => cBound.bottom)) - top;
  const midX = left + width / 2;
  const midY = top + height / 2;
  if (width === 0 || height === 0){
    // nothing to fit
    return;
  }
  const scale = PADDING_PERCENT / Math.max(width / fullWidth, height / fullHeight);
  const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

  var centerTheVSEXPPlan = 800;

  if($(".query-details-visualExplain").length){
    centerTheVSEXPPlan = 650;
  } else {
    centerTheVSEXPPlan = 200 + (550 - (50 * (data.connections.length)));
  }
  if(centerTheVSEXPPlan < 200 ) {
   centerTheVSEXPPlan = 250;
  }
  zoom.scale(scale).translate([centerTheVSEXPPlan, 50]);

  svg
    .transition()
    .delay(750)
    .call( zoom.event );
}
function caluclateArrowOffsetFF(arrowClosure) {
    if($("#explain-container").width() > 1000) {
      arrowClosure = arrowClosure+80;
    } else if($("#explain-container").width() > 900) {
      arrowClosure = arrowClosure+72;
    } else if($("#explain-container").width() > 600) {
      arrowClosure = arrowClosure-70;
    }
    return arrowClosure;
}
function getConnectionPathFF(connector, svg, container, data, isWhereClausePresent) {
  const source = container.select(`#${connector._source._uuid}`).node();
  const target = container.select(`#${connector._target._uuid}`).node();
  const rSource = d3.select(source).data()[0];
  const rTarget = d3.select(target).data()[0];
  const rSourceVertex = d3.select(Ember.$(source).closest('.vertex').get(0)).data()[0];
  const rTargetVertex = d3.select(Ember.$(target).closest('.vertex').get(0)).data()[0];

  const offsetBox = Ember.$(container.node()).children('.vertex').get(0).getBoundingClientRect();
  let connectionComplexity, connection = data.nodes.find((item)=>item["filterExpr:"]);
  if(connection){
    connectionComplexity = 0;
  } else {
    connectionComplexity = data.connections.length;
  }
  let leftOffset = Ember.$('.left-pane').hasClass("left-menu-icons")? 0: -100, FFoffset = (parseInt($(".visual-explain-container").css("width"))/10)*5;
  if($(".query-editor-db").hasClass("hide") && Ember.$('.left-pane').hasClass("left-menu-icons")) {
    leftOffset = 0;
  } else if(!Ember.$('.left-pane').hasClass("left-menu-icons") && $(".query-editor-db").hasClass("hide")){
    leftOffset = 0;
  } else if($(".query-details-visualExplain").length){
    FFoffset = 0;
    if(Ember.$('.left-pane').hasClass("left-menu-icons")){
      leftOffset = parseInt($("#explain-container").css("width"))/10;
    } else {
      leftOffset = 70+parseInt($("#explain-container").css("width"))/10;
    }
  }
  const pSource = {
    x: offsetBox.left - 200 - 200*connectionComplexity + (rSourceVertex._X + (rSourceVertex._widthOfSelf - (rSource._indexX + 1))) * 200 + 140 / 2,
    y: offsetBox.top + (rSourceVertex._Y + rSource._indexY) * 100 + 55 / 2,
  };
  const pTarget = {
    x: offsetBox.left - 200 - 200*connectionComplexity + (rTargetVertex._X + (rTargetVertex._widthOfSelf - (rTarget._indexX + 1))) * 200 + 140 / 2,
    y: offsetBox.top + (rTargetVertex._Y + rTarget._indexY) * 100 + 55 / 2,
  };
  const path = [
    pTarget
  ];
  const junctionXMultiplier = (pTarget.x - pSource.x < 0) ? +1 : -1;
  if(pSource.y !== pTarget.y) {
    path.push({
      x: pTarget.x + junctionXMultiplier * 90,
      y: pTarget.y
    }, {
      x: pTarget.x + junctionXMultiplier * 90,
      y: pSource.y
    });
  }
  path.push(pSource);
  const offsetY = svg.node().getBoundingClientRect().top;
  let firefoxPathOffset = 0;

  if(!$(".query-details-visualExplain").length){
      if(data.tree._height === 2) {
        firefoxPathOffset = 1590;
      } else if (data.tree._height === 3) {
        firefoxPathOffset = 1590+((data.tree._height-1)*500);
      } else if(data.tree._height > 3) {
        firefoxPathOffset = 1590+(((data.tree._height*2)-4)*500);
      }
      if($(".visual-explain-container").width() > 1000) {
        FFoffset = 480;
      } else if($(".visual-explain-container").width() > 900) {
        FFoffset = 400;
      } else if($(".visual-explain-container").width() > 600) {
        FFoffset = 440;
      }
      if(isWhereClausePresent) {
        firefoxPathOffset = 0;
        if(data.tree._height === 1) {
          firefoxPathOffset = -180;
        }
      }
  }

  return path.reduce((accumulator, cPoint, index) => {
    if(index === 0) {
      return accumulator + `M ${cPoint.x - leftOffset - FFoffset + firefoxPathOffset}, ${cPoint.y - offsetY}\n`;
    } else {
      return accumulator + `L ${cPoint.x - leftOffset - FFoffset - 25 + firefoxPathOffset}, ${cPoint.y - offsetY}\n`;
    }
  }, '');
}

function getConnectionPathFFArrow(connector, svg, container, data, isWhereClausePresent) {
  const source = container.select(`#${connector._source._uuid}`).node();
  const target = container.select(`#${connector._target._uuid}`).node();
  const rSource = d3.select(source).data()[0];
  const rTarget = d3.select(target).data()[0];
  const rSourceVertex = d3.select(Ember.$(source).closest('.vertex').get(0)).data()[0];
  const rTargetVertex = d3.select(Ember.$(target).closest('.vertex').get(0)).data()[0];

  const offsetBox = Ember.$(container.node()).children('.vertex').get(0).getBoundingClientRect();
  let leftOffset = Ember.$('.left-pane').hasClass("left-menu-icons")? 0: -100, ffOffset = (parseInt($("#explain-container").css("width"))/10)*5;
  if($(".query-editor-db").hasClass("hide") && Ember.$('.left-pane').hasClass("left-menu-icons")) {
    leftOffset = 250;
  } else if(!Ember.$('.left-pane').hasClass("left-menu-icons") && $(".query-editor-db").hasClass("hide")){
    leftOffset = 150;
  } else if($(".query-details-visualExplain").length){
    ffOffset = 10;
    if(Ember.$('.left-pane').hasClass("left-menu-icons")){
      leftOffset = 50;
    } else {
      leftOffset = 170;
    }
  }
  let connectionComplexity, connection = data.nodes.find((item)=>item["filterExpr:"]);
  if(connection){
    connectionComplexity = 0;
  } else {
    connectionComplexity = data.connections.length;
  }
  const pSource = {
    x: offsetBox.left - 200 - 200*connectionComplexity + (rSourceVertex._X + (rSourceVertex._widthOfSelf - (rSource._indexX + 1))) * 200 + 140 / 2,
    y: offsetBox.top + (rSourceVertex._Y + rSource._indexY) * 100 + 55 / 2,
  };
  const pTarget = {
    x: offsetBox.left - 200 - 200*connectionComplexity + (rTargetVertex._X + (rTargetVertex._widthOfSelf - (rTarget._indexX + 1))) * 200 + 140 / 2,
    y: offsetBox.top + (rTargetVertex._Y + rTarget._indexY) * 100 + 55 / 2,
  };
  const path = [
    pTarget
  ];
  const junctionXMultiplier = (pTarget.x - pSource.x < 0) ? +1 : -1;
  if(pSource.y !== pTarget.y) {
    path.push({
      x: pTarget.x + junctionXMultiplier * 90,
      y: pTarget.y
    }, {
      x: pTarget.x + junctionXMultiplier * 90,
      y: pSource.y
    });
  }


  var arrowOffset, arrowClosure= 0;
  if($(".query-details-visualExplain").length) {
    if(Ember.$('.left-pane').hasClass("left-menu-icons")){
      arrowOffset = parseInt($(".left-menu").css("width"));
    } else {
      arrowOffset = parseInt($(".left-menu").css("width"));
    }
    if($(".query-details-visualExplain").width() > 1200) {
      arrowClosure = arrowClosure + 58;
    } else if($(".query-details-visualExplain").width() > 1000) {
      arrowClosure = arrowClosure + 76;
    } else {
      arrowClosure = arrowClosure + 107;
    }
  } else if($(".query-editor-db").hasClass("hide")) {
    arrowOffset = parseInt(Ember.$('.left-menu').css("width")) + parseInt($("#db_accordion_expand").css("width"))+5;

    if((parseInt(arrowOffset/140 * 15)%10) >= 5){
      arrowClosure = Math.round((parseInt(arrowOffset/140 * 15) + (10 - (parseInt(arrowOffset/140 * 15)%10))))+1;
    } else {
      arrowClosure = Math.round((parseInt(arrowOffset/140 * 15) - (parseInt(arrowOffset/140 * 15)%10)))+1;
    }
    arrowClosure = caluclateArrowOffsetFF(arrowClosure);

  } else if($("#db_accordion_expand").hasClass("hide")) {
    arrowOffset = parseInt(Ember.$('.left-menu').css("width")) + parseInt($(".query-editor-db").css("width"));
    if((parseInt(arrowOffset/140 * 15)%10) >= 5){
      arrowClosure = Math.round((parseInt(arrowOffset/140 * 15) + (10 - (parseInt(arrowOffset/140 * 15)%10))))+1;
    } else {
      arrowClosure = Math.round((parseInt(arrowOffset/140 * 15) - (parseInt(arrowOffset/140 * 15)%10)))+1;
    }
    arrowClosure = caluclateArrowOffsetFF(arrowClosure);
  }
  if(isWhereClausePresent && data.tree._height === 1) {
    arrowClosure = arrowClosure - 200;
  }
  path.push(pSource);
  const offsetY = svg.node().getBoundingClientRect().top;
  return path.reduce((accumulator, cPoint, index) => {

    if(path.length === 2){
      if(index === 0) {
        if(cPoint.x > 0){
          return accumulator + `M ${cPoint.x - leftOffset -ffOffset+arrowClosure}, ${cPoint.y - offsetY-5 > 100? cPoint.y - offsetY+5 : cPoint.y - offsetY-7} V 10, ${cPoint.y - offsetY-5 > 100? (((cPoint.y - offsetY-5))): 34}  L ${cPoint.x - leftOffset -ffOffset+arrowClosure-5}, ${cPoint.y - offsetY} Z\n`;
        } else {
          return accumulator + `M ${cPoint.x - leftOffset -(ffOffset/2.5)+arrowClosure-6}, ${cPoint.y - offsetY-7} V 10, ${cPoint.y - offsetY-5 > 100? (((cPoint.y - offsetY-5))): 34}  L ${cPoint.x - leftOffset -(ffOffset/2.5)+arrowClosure-11}, ${cPoint.y - offsetY} Z\n`;
        }
      } else {
        return accumulator;
      }
    } else {
      if(index === 0) {
        if(cPoint.x > 0) {
          return accumulator + `M ${cPoint.x - leftOffset -ffOffset+arrowClosure}, ${cPoint.y - offsetY-10} V 10, ${cPoint.y - offsetY-5 > 100? (((cPoint.y - offsetY-5))): 34} L ${cPoint.x - leftOffset -ffOffset+arrowClosure-5}, ${cPoint.y - offsetY} Z\n`;
        } else {
          return accumulator + `M ${cPoint.x - leftOffset -ffOffset+arrowClosure}, ${cPoint.y - offsetY-5} V 10, ${cPoint.y - offsetY-5 > 100? (((cPoint.y - offsetY-5))): 34} L ${cPoint.x - leftOffset -ffOffset+arrowClosure-5}, ${cPoint.y - offsetY} Z\n`;
        }
      } else {
        return accumulator;
      }
    }

  }, '');
}

function getConnectionPath(connector, svg, container, data){

  const operators = container.selectAll('.operator');
  const source = container.select(`#${connector._source._uuid}`);
  const target = container.select(`#${connector._target._uuid}`);
  const rSource = source.node().getBoundingClientRect();
  const rTarget = target.node().getBoundingClientRect();
  const pSource = {
    x: (rSource.left + rSource.right) / 2,
    y: (rSource.top + rSource.bottom) / 2,
  };
  const pTarget = {
    x: (rTarget.left + rTarget.right) / 2,
    y: (rTarget.top + rTarget.bottom) / 2,
  };
  const path = [
    pTarget
  ];
  const junctionXMultiplier = (pTarget.x - pSource.x < 0) ? +1 : -1;
  let leftOffset = 0, padding = 20;
  if($(".query-details-visualExplain").length){
      if(Ember.$('.left-pane').hasClass("left-menu-icons")){
        leftOffset = parseInt($(".left-menu").css("width"));
      } else {
        leftOffset = parseInt($(".left-menu").css("width"));
      }
  }
  else if($(".query-editor-db").hasClass("hide")) {
    leftOffset = parseInt($(".left-menu").css("width"))+ parseInt($("#db_accordion_expand").css("width"))+5;
  } else if(!$(".query-editor-db").hasClass("hide")){
    leftOffset =  parseInt($(".left-menu").css("width"))+parseInt($(".query-editor-db").css("width"));
  }
  if(pSource.y !== pTarget.y) {
    path.push({
      x: pTarget.x + junctionXMultiplier * 90,
      y: pTarget.y
    }, {
      x: pTarget.x + junctionXMultiplier * 90,
      y: pSource.y
    });
  }
  path.push(pSource);
  const offsetY = svg.node().getBoundingClientRect().top;
  let isEdgeReversed = false, edgeReversalVal;
  return path.reduce((accumulator, cPoint, index) => {
    if(index === 0) {
      if(cPoint.x > (cPoint.y - offsetY)) {
        edgeReversalVal = cPoint.x;
        isEdgeReversed = true;
      }
      return accumulator + `M ${cPoint.x -leftOffset} , ${cPoint.y - offsetY}\n`;
    } else {
      if(isEdgeReversed && path.length === 4 && index !== path.length-1 && edgeReversalVal > cPoint.x){
        return accumulator + `L ${cPoint.x+150 -leftOffset}, ${cPoint.y - offsetY}\n`;
      }
      return accumulator + `L ${cPoint.x -leftOffset}, ${cPoint.y - offsetY}\n`;
    }
  }, '');
}

function getConnectionPathArrow(connector, svg, container) {


  const operators = container.selectAll('.operator');
  const source = container.select(`#${connector._source._uuid}`);
  const target = container.select(`#${connector._target._uuid}`);
  const rSource = source.node().getBoundingClientRect();
  const rTarget = target.node().getBoundingClientRect();
  const pSource = {
    x: (rSource.left + rSource.right) / 2,
    y: (rSource.top + rSource.bottom) / 2,
  };
  const pTarget = {
    x: (rTarget.left + rTarget.right) / 2,
    y: (rTarget.top + rTarget.bottom) / 2,
  };
  const path = [
    pTarget
  ];
  const junctionXMultiplier = (pTarget.x - pSource.x < 0) ? +1 : -1;
  if(pSource.y !== pTarget.y) {
    path.push({
      x: pTarget.x + junctionXMultiplier * 90,
      y: pTarget.y
    }, {
      x: pTarget.x + junctionXMultiplier * 90,
      y: pSource.y
    });
  }
  path.push(pSource);
  const offsetY = svg.node().getBoundingClientRect().top;
  var arrowOffset = Ember.$('.left-pane').hasClass("left-menu-icons")? 0: -100, arrowClosure = 0;

  if($(".query-details-visualExplain").length) {
    arrowClosure = 40;
    if(Ember.$('.left-pane').hasClass("left-menu-icons")){
      arrowOffset = parseInt($(".left-menu").css("width"))-10;
    } else {
      arrowOffset = parseInt($(".left-menu").css("width"))-10;
    }
  } else {
      if($(".query-editor-db").hasClass("hide")) {
        arrowOffset = parseInt(Ember.$('.left-menu').css("width")) + parseInt($("#db_accordion_expand").css("width"))+5;
      } else if($("#db_accordion_expand").hasClass("hide")) {
        arrowOffset = parseInt(Ember.$('.left-menu').css("width")) + parseInt($(".query-editor-db").css("width"));
      }
      if((parseInt(arrowOffset/140 * 15)%10) >= 5){
        arrowClosure = Math.round(100 - (parseInt(arrowOffset/140 * 15) + (10 - (parseInt(arrowOffset/140 * 15)%10))))-5;
      } else {
        arrowClosure = Math.round(100 - (parseInt(arrowOffset/140 * 15) - (parseInt(arrowOffset/140 * 15)%10)))-5;
      }
  }
  return path.reduce((accumulator, cPoint, index) => {
    var temp;
    if(Ember.$(".query-details-visualExplain").length) {
      temp = cPoint.x -arrowOffset +40;
    } else {
        var tempOffset = cPoint.x - arrowOffset;
        temp = tempOffset + arrowClosure;
    }

    if(path.length === 2){
      if(index === 0) {
        if(cPoint.x > 0){
          return accumulator + `M ${temp}, ${cPoint.y - offsetY-7} V 0, ${(((cPoint.y - offsetY-15)/100)*100)+23}  L ${temp-5}, ${cPoint.y - offsetY} Z\n`;
        } else {
          return accumulator + `M ${temp}, ${cPoint.y - offsetY-7} V 0, ${(((cPoint.y - offsetY-15)/100)*100)+23}  L ${temp-5}, ${cPoint.y - offsetY} Z\n`;
        }
      } else {
        return accumulator;
      }
    } else {

      if(index === 0) {
        if(cPoint.x > 0) {
          return accumulator + `M ${temp}, ${cPoint.y - offsetY-7} V 0, ${(((cPoint.y - offsetY-15)/100)*100)+23} L ${temp-5}, ${cPoint.y - offsetY} Z\n`;
        } else {
          return accumulator + `M ${temp}, ${cPoint.y - offsetY+9} V 0, 67 L ${temp-5}, ${cPoint.y - offsetY} Z\n`;
        }
      } else {
        return accumulator;
      }
    }
  }, '');

}

function doClean(node) {
  if(Array.isArray(node._groups)) {
    return node._groups.map(cGroup => doClean(cGroup));
  } else {
    return (
      Object.keys(node)
        .filter(cNodeKey => cNodeKey === '_operator' || !cNodeKey.startsWith('_'))
        .reduce((accumulator, cNodeKey) => {
          accumulator[cNodeKey] = node[cNodeKey];
          return accumulator;
        }, {})
    );
  }
}
