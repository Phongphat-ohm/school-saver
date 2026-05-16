pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'DOCKER_IMAGE', defaultValue: 'school-saver', description: 'Docker image name, for example registry.example.com/team/school-saver')
    string(name: 'DOCKER_REGISTRY', defaultValue: '', description: 'Optional registry host for docker login, for example registry.example.com')
    string(name: 'DOCKER_CREDENTIALS_ID', defaultValue: 'docker-registry', description: 'Jenkins username/password credentials id for Docker registry')
    string(name: 'DATABASE_URL_CREDENTIALS_ID', defaultValue: 'school-saver-database-url', description: 'Jenkins secret text credentials id containing production DATABASE_URL')
    string(name: 'DOCKER_NETWORK', defaultValue: '', description: 'Optional Docker network for migration container to reach database')
    booleanParam(name: 'RUN_MIGRATIONS', defaultValue: true, description: 'Run prisma migrate deploy before deployment')
    booleanParam(name: 'PUSH_IMAGE', defaultValue: false, description: 'Push image tags to registry')
    booleanParam(name: 'DEPLOY_COMPOSE', defaultValue: false, description: 'Run docker compose up on this Jenkins agent')
  }

  environment {
    NODE_ENV = 'test'
    DOCKER_BUILDKIT = '1'
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Typecheck') {
      steps {
        sh 'npm run typecheck'
      }
    }

    stage('Build Image') {
      steps {
        script {
          env.IMAGE_TAG = "${params.DOCKER_IMAGE}:${env.BUILD_NUMBER}"
          env.LATEST_TAG = "${params.DOCKER_IMAGE}:latest"
          env.MIGRATOR_TAG = "${params.DOCKER_IMAGE}:migrator-${env.BUILD_NUMBER}"
        }
        sh 'docker build --target runner -t "$IMAGE_TAG" -t "$LATEST_TAG" .'
        sh 'docker build --target migrator -t "$MIGRATOR_TAG" .'
      }
    }

    stage('Database Migrate') {
      when {
        expression { return params.RUN_MIGRATIONS }
      }
      steps {
        script {
          def networkArg = params.DOCKER_NETWORK?.trim() ? "--network ${params.DOCKER_NETWORK.trim()}" : ""
          withCredentials([string(credentialsId: params.DATABASE_URL_CREDENTIALS_ID, variable: 'DATABASE_URL')]) {
            withEnv(["DOCKER_NETWORK_ARG=${networkArg}"]) {
              sh 'docker run --rm $DOCKER_NETWORK_ARG -e DATABASE_URL="$DATABASE_URL" "$MIGRATOR_TAG"'
            }
          }
        }
      }
    }

    stage('Push Image') {
      when {
        expression { return params.PUSH_IMAGE }
      }
      steps {
        script {
          withCredentials([usernamePassword(credentialsId: params.DOCKER_CREDENTIALS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
            if (params.DOCKER_REGISTRY?.trim()) {
              sh 'echo "$DOCKER_PASS" | docker login "$DOCKER_REGISTRY" -u "$DOCKER_USER" --password-stdin'
            } else {
              sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
            }
          }
        }
        sh 'docker push "$IMAGE_TAG"'
        sh 'docker push "$LATEST_TAG"'
      }
    }

    stage('Deploy Compose') {
      when {
        expression { return params.DEPLOY_COMPOSE }
      }
      steps {
        withCredentials([string(credentialsId: params.DATABASE_URL_CREDENTIALS_ID, variable: 'DATABASE_URL')]) {
          sh 'APP_IMAGE="$LATEST_TAG" APP_DATABASE_URL="$DATABASE_URL" docker compose up -d --remove-orphans'
        }
      }
    }
  }

  post {
    always {
      sh 'docker image prune -f --filter "label=stage=intermediate" || true'
    }
  }
}
