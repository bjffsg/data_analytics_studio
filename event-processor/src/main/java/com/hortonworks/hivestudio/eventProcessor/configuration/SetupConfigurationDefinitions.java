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
package com.hortonworks.hivestudio.eventProcessor.configuration;

import java.util.List;
import java.util.Optional;

import com.google.common.collect.ImmutableList;
import com.hortonworks.hivestudio.common.command.SetupConfiguration;


/**
 * Returns the list of configurations that need to be entered by user during setup command
 * ({@link com.hortonworks.hivestudio.common.command.SetupCommand}).
 */
public class SetupConfigurationDefinitions {

  private final static List<SetupConfiguration> configurations = ImmutableList.of(
    new SetupConfiguration("jdbcUrl",
      "JDBC url for the postgres database", true, Optional.empty()),
    new SetupConfiguration("username",
      "Database username", true, Optional.empty()),
    new SetupConfiguration("password",
      "Database password", true, Optional.empty()),
    new SetupConfiguration("serverPort",
      "Hive Studio server port", false, Optional.of("9090")),
    new SetupConfiguration("adminServerPort",
      "Hive Studio admin server port", false, Optional.of("9091"))
  );

  public static List<SetupConfiguration> get() {
    return configurations;
  }
}
