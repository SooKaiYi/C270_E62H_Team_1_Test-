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

        NVD_API_KEY = credentials('nvd-api-key')

        // NOTE: these use host.docker.internal instead of localhost, since
        // curl/newman run INSIDE the Jenkins container, not on the host --
        // localhost inside that container is not the same localhost as the
        // one bike-staging/bike-production actually publish their ports on.
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
                echo 'Running ESLint (Code Quality)...'
                sh 'npm run lint'

                echo 'Running Prettier (Formatting Check)...'
                sh 'npm run format:check'
            }
        }

        stage('Automated Tests') {
            steps {
                sh 'npm test'
            }
        }

        stage('Trivy Filesystem Scan') {
            steps {
                echo 'Running Trivy filesystem security scan...'
                
                sh '''
                    rm -rf security-reports
                    mkdir -p security-reports

                    docker run --rm \
                        -v "$WORKSPACE:/project" \
                        -v "$WORKSPACE/security-reports:/reports" \
                        -v trivy-cache:/root/.cache/trivy \
                        aquasec/trivy:latest \
                        fs \
                        --scanners vuln,secret,misconfig \
                        --severity HIGH,CRITICAL \
                        --exit-code 0 \
                        --format table \
                        --output /reports/trivy-filesystem.txt \
                        /project
                '''
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                echo 'Running OWASP Dependency-Check...'

                sh 'mkdir -p security-reports'

                sh '''
                    docker run --rm \
                    -v "$WORKSPACE:/src" \
                    -v dependency-check-data:/usr/share/dependency-check/data \
                    -v "$WORKSPACE/security-reports:/report" \
                    owasp/dependency-check:latest \
                    --project "CityScoot" \
                    --scan /src \
                    --format ALL \
                    --out /report \
                    --nvdApiKey "$NVD_API_KEY" \
                    --nvdApiDelay 6000 \
                    --nvdMaxRetryCount 5
                '''
            }
        }

        //SonarQube configuration


        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Trivy Image Scan') {
            steps {
                echo 'Running Trivy Docker image scan...'

                sh 'mkdir -p security-reports'

                sh '''
                    docker run --rm \
                    -v /var/run/docker.sock:/var/run/docker.sock \
                    -v trivy-cache:/root/.cache/trivy \
                    -v "$WORKSPACE/security-reports:/reports" \
                    aquasec/trivy:latest \
                    image \
                    --severity HIGH,CRITICAL \
                    --exit-code 0 \
                    --format table \
                    --output /reports/trivy-image.txt \
                    "${IMAGE_NAME}:${IMAGE_TAG}"
                '''
            }
        }

        // Quality Gate will be added after SonarQube, OWASP and testing stages are integrated.


        stage('API Tests') {
            steps {
                withCredentials([
                    string(credentialsId: 'api-test-email', variable: 'API_TEST_EMAIL'),
                    string(credentialsId: 'api-test-password', variable: 'API_TEST_PASSWORD')
                ]) {
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
                sh """
                    docker rm -f ${STAGING_CONTAINER} 2>/dev/null || echo No existing staging container

                    docker run -d \
                      -p 3001:3000 \
                      --name ${STAGING_CONTAINER} \
                      ${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
        }

        stage('Verify Staging') {
            steps {
                script {
                    retry(5) {
                        sleep time: 3, unit: 'SECONDS'

                        sh "curl -f ${STAGING_URL}/login.html || exit 1"
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
                sh """
                    docker rm -f ${PRODUCTION_CONTAINER} 2>/dev/null || echo No existing production container

                    docker run -d \
                      -p 3000:3000 \
                      --name ${PRODUCTION_CONTAINER} \
                      ${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
        }

        stage('Verify Production') {
            steps {
                script {
                    retry(5) {
                        sleep time: 3, unit: 'SECONDS'

                        sh "curl -f ${PRODUCTION_URL}/login.html || exit 1"
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
            archiveArtifacts(
                artifacts: 'security-reports/**',
                allowEmptyArchive: true,
                fingerprint: true
                )

            echo "Finished Jenkins build ${BUILD_NUMBER}."
        }
    }
}