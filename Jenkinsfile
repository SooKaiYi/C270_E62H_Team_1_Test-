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
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing project dependencies...'
                sh 'npm ci'
            }
        }

        stage('Code Quality Checks') {
            steps {
                echo 'Running ESLint...'
                sh 'npm run lint'

                echo 'Running Prettier formatting check...'
                sh 'npm run format:check'

                echo 'Running Dockerfile quality checks with Hadolint...'
                sh 'docker run --rm -i hadolint/hadolint < Dockerfile'
            }
        }

        stage('Automated Tests') {
            steps {
                echo 'Running Jest unit tests...'
                sh 'npm test -- --runInBand'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube code analysis...'

                withSonarQubeEnv('CityScoot-SonarQube') {
                    sh 'npx @sonar/scan'
                }
            }
        }

        stage('Trivy Filesystem Scan') {
            steps {
                echo 'Running Trivy filesystem security scan...'

                sh '''
                    rm -rf security-reports
                    mkdir -p security-reports

                    docker run --rm \
                      --user root \
                      -v jenkins-data:/var/jenkins_home \
                      -v trivy-cache:/root/.cache/trivy \
                      aquasec/trivy:latest \
                      fs \
                      --scanners vuln,secret,misconfig \
                      --severity HIGH,CRITICAL \
                      --exit-code 0 \
                      --format table \
                      --output "$WORKSPACE/security-reports/trivy-filesystem.txt" \
                      "$WORKSPACE"
                '''
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                echo 'Running OWASP Dependency-Check...'

                sh '''
                    mkdir -p security-reports

                    docker run --rm \
                      --user root \
                      -v jenkins-data:/var/jenkins_home \
                      -v dependency-check-data:/usr/share/dependency-check/data \
                      owasp/dependency-check:latest \
                      --project "CityScoot" \
                      --scan "$WORKSPACE" \
                      --format HTML \
                      --format JSON \
                      --out "$WORKSPACE/security-reports" \
                      --noupdate \
                      --disableHostedSuppressions \
                      --disableYarnAudit
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'

                sh """
                    docker build \
                      -t ${IMAGE_NAME}:${IMAGE_TAG} \
                      -t ${IMAGE_NAME}:latest \
                      .
                """
            }
        }

        stage('Trivy Image Scan') {
            steps {
                echo 'Running Trivy Docker image scan...'

                sh '''
                    mkdir -p security-reports

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

        stage('Quality Gate') {
            steps {
                echo 'Waiting for SonarQube Quality Gate result...'

                timeout(time: 5, unit: 'MINUTES') {
                    script {
                        def qualityGate = waitForQualityGate()

                        if (qualityGate.status != 'OK') {
                            error "Quality Gate failed: ${qualityGate.status}"
                        }

                        echo 'Quality Gate passed.'
                    }
                }
            }
        }

        stage('API Tests') {
            steps {
                echo 'Starting temporary API test container...'

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

                echo 'Waiting for API test container to respond...'

                script {
                    retry(5) {
                        sleep time: 3, unit: 'SECONDS'

                        sh '''
                            curl -f \
                              http://host.docker.internal:${API_TEST_PORT}/login.html
                        '''
                    }
                }

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
                    echo 'Removing temporary API test container...'

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
                echo 'Deploying application to staging using Ansible...'

                sh '''
                    ansible-playbook \
                      -i ansible/inventories/hosts.ini \
                      ansible/playbooks/deploy-staging.yml
                '''
            }
        }

        stage('Verify Staging') {
            steps {
                echo 'Verifying staging deployment...'

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
                echo 'Deploying application to production using Ansible...'

                sh '''
                    ansible-playbook \
                      -i ansible/inventories/hosts.ini \
                      ansible/playbooks/deploy-production.yml
                '''
            }
        }

        stage('Verify Production') {
            steps {
                echo 'Verifying production deployment...'

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
            echo 'Archiving security scan reports...'

            archiveArtifacts(
                artifacts: 'security-reports/**',
                allowEmptyArchive: true,
                fingerprint: true
            )

            echo "Finished Jenkins build ${BUILD_NUMBER}."
        }
    }
}