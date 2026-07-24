pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        IMAGE_NAME = 'bike-app'
        IMAGE_TAG = "${BUILD_NUMBER}"

        STAGING_CONTAINER = 'bike-staging'
        PRODUCTION_CONTAINER = 'bike-production'

        API_TEST_CONTAINER = 'bike-api-test'
        API_TEST_PORT = '3002'

        API_TEST_EMAIL = credentials('api-test-email')
        API_TEST_PASSWORD = credentials('api-test-password')

        DB_HOST = credentials('db-host')
        DB_PORT = credentials('db-port')
        DB_USER = credentials('db-user')
        DB_PASSWORD = credentials('db-password')
        DB_NAME = credentials('db-name')

        STAGING_URL = 'http://host.docker.internal:3001'
        PRODUCTION_URL = 'http://host.docker.internal:3000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Code Quality Checks') {
            steps {
                echo 'Running ESLint...'
                sh 'npm run lint'

                echo 'Running Prettier formatting check...'
                sh 'npm run format:check'
            }
        }

        stage('Automated Tests') {
            steps {
                sh 'npm test'
            }
        }

        // SonarQube configuration can be added here.

        // OWASP Dependency-Check configuration can be added here.

        // Quality Gate can be added after all security tools are integrated.

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build \
                      -t ${IMAGE_NAME}:${IMAGE_TAG} \
                      -t ${IMAGE_NAME}:latest \
                      .
                """
            }
        }

        stage('API Tests') {
            steps {
                sh "docker rm -f ${API_TEST_CONTAINER} || true"

                sh '''
                    docker run -d \
                      -p ${API_TEST_PORT}:3000 \
                      --name ${API_TEST_CONTAINER} \
                      -e DB_HOST="$DB_HOST" \
                      -e DB_PORT="$DB_PORT" \
                      -e DB_USER="$DB_USER" \
                      -e DB_PASSWORD="$DB_PASSWORD" \
                      -e DB_NAME="$DB_NAME" \
                      -e PORT=3000 \
                      ${IMAGE_NAME}:${IMAGE_TAG}
                '''

                sh 'sleep 8'

                echo 'Checking whether API test container is responding...'

                sh '''
                    curl -f \
                      http://host.docker.internal:${API_TEST_PORT}/login.html
                '''

                echo 'Running Newman API tests...'

                sh '''
                    npx newman run \
                      tests/api/CityScoot-API-Tests.postman_collection.json \
                      --env-var baseUrl=http://host.docker.internal:${API_TEST_PORT} \
                      --env-var testEmail="$API_TEST_EMAIL" \
                      --env-var testPassword="$API_TEST_PASSWORD" \
                      --reporters cli,junit \
                      --reporter-junit-export newman-report.xml
                '''
            }

            post {
                always {
                    sh "docker rm -f ${API_TEST_CONTAINER} || true"

                    junit(
                        allowEmptyResults: true,
                        testResults: 'newman-report.xml'
                    )
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                sh '''
                    docker rm -f ${STAGING_CONTAINER} 2>/dev/null || \
                      echo "No existing staging container"

                    docker run -d \
                      -p 3001:3000 \
                      --name ${STAGING_CONTAINER} \
                      -e DB_HOST="$DB_HOST" \
                      -e DB_PORT="$DB_PORT" \
                      -e DB_USER="$DB_USER" \
                      -e DB_PASSWORD="$DB_PASSWORD" \
                      -e DB_NAME="$DB_NAME" \
                      -e PORT=3000 \
                      ${IMAGE_NAME}:${IMAGE_TAG}
                '''
            }
        }

        stage('Verify Staging') {
            steps {
                script {
                    retry(5) {
                        sleep time: 3, unit: 'SECONDS'

                        sh "curl -f ${STAGING_URL}/login.html"
                    }
                }
            }
        }

        stage('Production Approval') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    input(
                        message: 'Staging passed. Deploy to Production?',
                        ok: 'Deploy'
                    )
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                sh '''
                    docker rm -f ${PRODUCTION_CONTAINER} 2>/dev/null || \
                      echo "No existing production container"

                    docker run -d \
                      -p 3000:3000 \
                      --name ${PRODUCTION_CONTAINER} \
                      -e DB_HOST="$DB_HOST" \
                      -e DB_PORT="$DB_PORT" \
                      -e DB_USER="$DB_USER" \
                      -e DB_PASSWORD="$DB_PASSWORD" \
                      -e DB_NAME="$DB_NAME" \
                      -e PORT=3000 \
                      ${IMAGE_NAME}:${IMAGE_TAG}
                '''
            }
        }

        stage('Verify Production') {
            steps {
                script {
                    retry(5) {
                        sleep time: 3, unit: 'SECONDS'

                        sh "curl -f ${PRODUCTION_URL}/login.html"
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