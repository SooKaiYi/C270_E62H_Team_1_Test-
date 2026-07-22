pipeline {

    agent any

    options {
        // Jenkins already checks out the repository in our Checkout stage.
        skipDefaultCheckout(true)

        // Prevent two deployments from running at the same time.
        disableConcurrentBuilds()

        // Add timestamps to the console logs.
        timestamps()

        // Keep only the latest 10 Jenkins builds.
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        IMAGE_NAME = 'bike-app'
        IMAGE_TAG = "${BUILD_NUMBER}"

        STAGING_CONTAINER = 'bike-staging'
        PRODUCTION_CONTAINER = 'bike-production'

        // Short-lived container used ONLY for the API Tests stage below,
        // separate from the real Staging/Production containers.
        API_TEST_CONTAINER = 'bike-api-test'
        API_TEST_PORT = '3002'

        STAGING_URL = 'http://localhost:3001'
        PRODUCTION_URL = 'http://localhost:3000'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Code Quality Checks') {
            steps {
                echo 'Running ESLint (Code Quality)...'
                bat 'npm run lint'

                echo 'Running Prettier (Formatting Check)...'
                bat 'npm run format:check'
            }
        }

        stage('Code Quality - ESLint') {
            steps {
                bat 'npx eslint .'
            }
        }

        stage('Automated Tests') {
            steps {
                bat 'npm test'
            }
        }

        //SonarQube configuration


        //OWASP Dependency Check configuration


        // Quality Gate will be added after SonarQube, OWASP and testing stages are integrated.


        stage('Build Docker Image') {
            steps {
                bat '''
                docker build ^
                  -t %IMAGE_NAME%:%IMAGE_TAG% ^
                  -t %IMAGE_NAME%:latest .
                '''
            }
        }

        stage('API Tests') {
            steps {
                sh "docker rm -f ${API_TEST_CONTAINER} || true"

                sh "docker run -d -p ${API_TEST_PORT}:3000 --name ${API_TEST_CONTAINER} ${IMAGE_NAME}:${IMAGE_TAG}"

                sh 'sleep 5'

                echo 'Smoke check - is the container even responding?'
                sh "curl -f http://host.docker.internal:${API_TEST_PORT}/login.html || exit 1"

                echo 'Running full API test suite via Newman...'
                sh """
                    npx newman run tests/api/CityScoot-API-Tests.postman_collection.json \
                      --env-var baseUrl=http://host.docker.internal:${API_TEST_PORT} \
                      --env-var testEmail=\$API_TEST_EMAIL \
                      --env-var testPassword=\$API_TEST_PASSWORD \
                      --reporters cli,junit \
                      --reporter-junit-export newman-report.xml
                """
            }
            post {
                always {
                    sh "docker rm -f ${API_TEST_CONTAINER} || true"
                    junit allowEmptyResults: true, testResults: 'newman-report.xml'
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                bat '''
                docker rm -f %STAGING_CONTAINER% 2>nul || echo No existing staging container

                docker run -d ^
                  -p 3001:3000 ^
                  --name %STAGING_CONTAINER% ^
                  %IMAGE_NAME%:%IMAGE_TAG%
                '''
            }
        }

        stage('Verify Staging') {
            steps {
                script {
                    retry(5) {
                        sleep time: 3, unit: 'SECONDS'

                        bat '''
                        powershell -Command ^
                        "$response = Invoke-WebRequest -Uri '%STAGING_URL%' -UseBasicParsing; ^
                        if ($response.StatusCode -ne 200) { exit 1 }"
                        '''
                    }
                }
            }
        }

        stage('Production Approval') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    input message: 'Staging passed. Deploy to Production?',
                          ok: 'Deploy'
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                bat '''
                docker rm -f %PRODUCTION_CONTAINER% 2>nul || echo No existing production container

                docker run -d ^
                  -p 3000:3000 ^
                  --name %PRODUCTION_CONTAINER% ^
                  %IMAGE_NAME%:%IMAGE_TAG%
                '''
            }
        }

        stage('Verify Production') {
            steps {
                script {
                    retry(5) {
                        sleep time: 3, unit: 'SECONDS'

                        bat '''
                        powershell -Command ^
                        "$response = Invoke-WebRequest -Uri '%PRODUCTION_URL%' -UseBasicParsing; ^
                        if ($response.StatusCode -ne 200) { exit 1 }"
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'CI/CD pipeline completed successfully.'
            echo "Docker image created: ${IMAGE_NAME}:${IMAGE_TAG}"
        }

        failure {
            echo 'Pipeline failed. Deployment has been stopped.'
            echo 'Check the failed Jenkins stage and console output.'
        }

        aborted {
            echo 'Pipeline was aborted or production was not approved.'
        }

        always {
            echo "Finished Jenkins build ${BUILD_NUMBER}."
        }
    }
}