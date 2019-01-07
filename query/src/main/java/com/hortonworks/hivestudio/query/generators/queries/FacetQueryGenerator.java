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
package com.hortonworks.hivestudio.query.generators.queries;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.ws.rs.core.Response;

import com.google.common.collect.Sets;
import com.hortonworks.hivestudio.common.Constants;
import com.hortonworks.hivestudio.common.exception.ServiceFormattedException;
import com.hortonworks.hivestudio.common.orm.EntityField;
import com.hortonworks.hivestudio.common.orm.EntityTable;

import lombok.extern.slf4j.Slf4j;


/**
 * Generates the Native query for hive and dag info search
 */
@Slf4j
public class FacetQueryGenerator {
  private final EntityTable hiveQuery;
  private final EntityTable dagInfo;
  private final Set<String> facetFields;
  private final List<String> predicates;

  public FacetQueryGenerator(EntityTable hiveQuery, EntityTable dagInfo, Set<String> facetFields,
      List<String> predicates) {
    this.hiveQuery = hiveQuery;
    this.dagInfo = dagInfo;
    this.facetFields = facetFields;
    this.predicates = predicates;
  }

  private static void addTable(StringBuilder builder, String schema, EntityTable table) {
    builder.append(schema);
    builder.append('.');
    builder.append(table.getTableName());
    builder.append(' ');
    builder.append(table.getTablePrefix());
  }

  public String generate() {
    validateFacetable();
    String schema = Constants.DATABASE_SCHEMA;
    StringBuilder builder = new StringBuilder(2048);
    builder.append("WITH query AS (SELECT ");
    int count = extractFacetableFields(builder, hiveQuery.getFields(), facetFields, 0);
    extractFacetableFields(builder, dagInfo.getFields(), facetFields, count);
    builder.append(" FROM ");
    addTable(builder, schema, hiveQuery);
    builder.append(" LEFT OUTER JOIN ");
    addTable(builder, schema, dagInfo);
    builder.append(" ON ");
    builder.append(hiveQuery.getTablePrefix());
    builder.append(".id = ");
    builder.append(dagInfo.getTablePrefix());
    builder.append(".hive_query_id ");
    boolean isFirst = true;
    for (String predicate : predicates) {
      if (isFirst) {
        builder.append(" WHERE ");
        isFirst = false;
      } else {
        builder.append(" AND ");
      }
      builder.append(predicate);
    }
    builder.append(") ");

    count = extractFacetCounts(builder, hiveQuery.getFields(), facetFields, 0);
    extractFacetCounts(builder, dagInfo.getFields(), facetFields, count);

    return builder.toString();
  }

  private void validateFacetable() {
    Stream<EntityField> firstFacetableFields = hiveQuery.getFields().stream().filter(x -> x.isFacetable() || x.isRangeFacetable());
    Stream<EntityField> secondFacetableFields = dagInfo.getFields().stream().filter(x -> x.isFacetable() || x.isRangeFacetable());
    Set<String> facetableFields = Stream.concat(
      firstFacetableFields.map(EntityField::getExternalFieldName),
      secondFacetableFields.map(EntityField::getExternalFieldName)
    ).collect(Collectors.toSet());

    Sets.SetView<String> difference = Sets.difference(facetFields, facetableFields);
    if(difference.size() > 0) {
      throwNotFacetableException(difference);
    }
  }

  private void getTablesReadOrWrittenProjection(StringBuilder builder, EntityField x) {
    builder.append("(SELECT 'facet' AS type, true AS first, '");
    builder.append(x.getExternalFieldName());
    builder.append("' AS key, NULL AS value) UNION ALL (SELECT NULL AS type, false AS first, " +
        "(element ->> 'database') || '.' || (element ->> 'table' )  AS key, count(*) AS value " +
        "FROM (SELECT jsonb_array_elements(");
    builder.append(x.getExternalFieldName());
    builder.append(") AS element FROM query) a GROUP BY element ORDER BY value DESC)");
  }

  private void getRangeFacetableProjection(StringBuilder builder, EntityField x) {
    builder.append("(SELECT 'range-facet' AS type, true AS first, '");
    builder.append(x.getExternalFieldName());
    builder.append("' AS key, NULL AS value) UNION ALL (SELECT NULL AS type, false AS first, " +
        "'MAX' AS key, MAX(");
    builder.append(x.getExternalFieldName());
    builder.append(") AS value FROM query) UNION ALL " +
        "(SELECT NULL AS type, false AS first, 'MIN' AS key, MIN(");
    builder.append(x.getExternalFieldName());
    builder.append(") AS value FROM query)");
  }

  private void getFacetableProjection(StringBuilder builder, EntityField x) {
    builder.append("(SELECT 'facet' AS type, true AS first, '");
    builder.append(x.getExternalFieldName());
    builder.append("' AS key, NULL AS value) UNION ALL " +
        "(SELECT NULL AS type, false AS first, ");
    builder.append(x.getExternalFieldName());
    builder.append(" AS key, count(*) AS value FROM query GROUP BY ");
    builder.append(x.getExternalFieldName());
    builder.append(" ORDER BY value DESC)");
  }

  private int extractFacetableFields(StringBuilder builder, List<EntityField> fields,
      Set<String> facetFields, int count) {
    for (EntityField field : fields) {
      if (facetFields.contains(field.getExternalFieldName()) &&
          (field.isFacetable() || field.isRangeFacetable())) {
        if (count++ > 0) {
          builder.append(", ");
        }
        builder.append(field.getEntityPrefix());
        builder.append(".");
        builder.append(field.getDbFieldName());
        builder.append(" AS ");
        builder.append(field.getExternalFieldName());
      }
    }
    return count;
  }

  private int extractFacetCounts(StringBuilder builder, List<EntityField> fields,
      Set<String> facetFields, int count) {
    for (EntityField field : fields) {
      if (facetFields.contains(field.getExternalFieldName()) &&
          (field.isFacetable() || field.isRangeFacetable())) {
        if (count++ > 0) {
          builder.append(" UNION ALL ");
        }
        if(field.isTableReadOrWrittenField()) {
          getTablesReadOrWrittenProjection(builder, field);
        } else if(field.isRangeFacetable()) {
          getRangeFacetableProjection(builder, field);
        } else {
          getFacetableProjection(builder, field);
        }
      }
    }
    return count;
  }

  private void throwNotFacetableException(Sets.SetView<String> difference) {
    String nonFacetableFields = String.join(", ", difference);
    log.error("Not able to process non-facetable fields '{}'.", nonFacetableFields);
    throw new ServiceFormattedException("Not able to process non-facetable fields '" +
        nonFacetableFields + "'.", Response.Status.BAD_REQUEST.getStatusCode());
  }
}
