pipeline {

    agent any

    environment {
        IMAGE_NAME = "bike-app"
        STAGING_CONTAINER = "bike-staging"
        PRODUCTION_CONTAINER = "bike-production"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Lint') {
            steps {
                bat 'npx eslint .'
            }
        }

        stage('Test') {
            steps {
                bat 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t %IMAGE_NAME% .'
            }
        }

        stage('Deploy to Staging') {
            steps {
                bat '''
                docker rm -f %STAGING_CONTAINER% || exit /b 0
                docker run -d -p 3001:3000 --name %STAGING_CONTAINER% %IMAGE_NAME%
                '''
            }
        }

        stage('Approval') {
            steps {
                input message: 'Deploy to Production?'
            }
        }

        stage('Deploy to Production') {
            steps {
                bat '''
                docker rm -f %PRODUCTION_CONTAINER% || exit /b 0
                docker run -d -p 3000:3000 --name %PRODUCTION_CONTAINER% %IMAGE_NAME%
                '''
            }
        }

    }

    post {
        success {
            echo 'Deployment Successful'
        }

        failure {
            echo 'Deployment Failed'
        }
    }
}