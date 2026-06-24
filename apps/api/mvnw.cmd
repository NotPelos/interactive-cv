@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements. See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership. The ASF licenses this file to
@REM you under the Apache License, Version 2.0 (the "License");
@REM you may not use this file except in compliance with the License.
@REM You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing, software
@REM distributed under the License is distributed on an "AS IS" BASIS,
@REM WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@REM See the License for the specific language governing permissions and
@REM limitations under the License.
@REM ----------------------------------------------------------------------------

@REM Apache Maven Wrapper startup batch script, version 3.3.2

@IF "%__MVNW_ARG0_NAME__%"=="" (SET "BASE_DIR=%~dp0")

@SET MAVEN_PROJECTBASEDIR=%BASE_DIR%
:chkMVNW
@IF NOT EXIST "%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties" (
  @SET "PARENT_DIR=%MAVEN_PROJECTBASEDIR%\.."
  @IF NOT "%PARENT_DIR%"=="%MAVEN_PROJECTBASEDIR%" (
    @SET "MAVEN_PROJECTBASEDIR=%PARENT_DIR%"
    @GOTO chkMVNW
  )
  @SET "MAVEN_PROJECTBASEDIR=%~dp0"
)

@SET MAVEN_WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar
@SET MAVEN_WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties

@IF NOT EXIST "%MAVEN_WRAPPER_JAR%" (
  FOR /F "usebackq tokens=1,2 delims==" %%A IN ("%MAVEN_WRAPPER_PROPERTIES%") DO (
    IF "%%A"=="wrapperUrl" SET WRAPPER_URL=%%B
  )
  WHERE curl >nul 2>&1
  IF %ERRORLEVEL%==0 (
    curl -o "%MAVEN_WRAPPER_JAR%" "%WRAPPER_URL%" -f -L --create-dirs
  ) ELSE (
    ECHO ERROR: curl is required to download the Maven Wrapper
    EXIT /B 1
  )
)

@IF NOT "%JAVA_HOME%"=="" (
  @SET "JAVACMD=%JAVA_HOME%\bin\java.exe"
) ELSE (
  @SET JAVACMD=java
)

@"%JAVACMD%" -classpath "%MAVEN_WRAPPER_JAR%" ^
  "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
  org.apache.maven.wrapper.MavenWrapperMain %*
