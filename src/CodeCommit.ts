//import * as chatbot from '@aws-cdk/aws-chatbot';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
//import * as notifications from '@aws-cdk/aws-codestarnotifications';
import {
  Peer,
  Port,
  SecurityGroup,
  Vpc,
} from '@aws-cdk/aws-ec2';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as iam from '@aws-cdk/aws-iam';
import * as sns from '@aws-cdk/aws-sns';
//import * as codeartifact from '@aws-cdk/aws-codeartifact';
//import codeartifact = require('@aws-cdk/aws-codeartifact');

//import * as subscriptions from '@aws-cdk/aws-sns-subscriptions';
import * as cdk from '@aws-cdk/core';

export class CodeCommit extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //iam
	 const serviceRole = new iam.Role(this,
      'Sample-Repo-IAM', { assumedBy: new iam.ServicePrincipal('sns.amazonaws.com') });
	   serviceRole.addToPolicy(new iam.PolicyStatement({
		   effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: ['*'],
    }));

    //vpc

    //const vpc = Vpc.fromLookup(this, 'ImportVPC', { isDefault: false });
    /*const vpc = new Vpc(this, 'my-VPC', {
      maxAzs: 3,
      //natGateways: 3,
    });
*/
    const vpc= Vpc.fromLookup(this, 'external-vpc', {
      vpcName: 'my-vpc-07',
    });
    //sg
    const sg = new SecurityGroup(this, 'SGS', {
      securityGroupName: 'Codebuild-security-group',
      vpc,
      allowAllOutbound: true,
    });


    sg.addIngressRule(Peer.ipv4('0.0.0.0/0'), Port.tcp(443));
    sg.addIngressRule(Peer.ipv4('0.0.0.0/0'), Port.tcp(80));

    /*const myTopic = new sns.Topic(this, 'Topic', {
      displayName: 'Codecommit changes',
    });*/
    const repository = codecommit.Repository.fromRepositoryArn(
      this,
      'Sample-Repo-Codecommit',
      'arn:aws:codecommit:us-east-2:078996536163:Sample-Repo-Codecommit',
    );
    //const repository = codecommit.Repository.fromRepositoryArn(this, "Sample-Repo-Codecommit", repository.repositoryArn)


    const project = new codebuild.Project(this, 'Sample-Repo-Codebuild', {
      source: codebuild.Source.codeCommit({ repository }),
	 vpc,
	 //role: serviceRole,
	  buildSpec: codebuild.BuildSpec.fromSourceFilename('project/buildspec.yml'),

      environment: {
		  buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
        privileged: true,
        computeType: codebuild.ComputeType.MEDIUM,
      },
    });
    repository.onCommit('CommitToMaster', {
    //target: new targets.CodeBuildProject(project),
      branches: ['master'],
    });

    /* repository.onCommentOnPullRequest('CommentOnPullRequest', {
      target: new targets.SnsTopic(myTopic),
    });*/
    //repository.onCommit(new targets.SnsTopic(myTopic));
    //const emailAddress = new CfnParameter(this, );
    //  myTopic.addSubscription(new subscriptions.EmailSubscription('ishitasaxena78@yahoo.in'));
    /*new codeartifact.Repository(this, {
    repository: "Sample-Repo-CodeArtifact",
    //domain: exampleDomain.domain,
});*/
    // const project = new codebuild.PipelineProject(this, 'Sample-Repo-CodeBuild',{
    const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
      actionName: 'Approve',
      //notificationTopic: new sns.Topic(this, 'myTopic'), // optional
      notifyEmails: [
        'ishitasaxena78@yahoo.in',
      ], // optional
      additionalInformation: 'Added approve stage', // optional*/
    });
    /*project.onBuildStarted('BuildStarted', {
          // target: new targets.SnsTopic(myTopic),
			notificationTopic:  new sns.Topic(this, 'myTopic'), // optional
      notifyEmails: [
        'ishitasaxena78@yahoo.in',
      ], // optional
	   additionalInformation: 'Build Started',
        });
		project.onBuildFailed('BuildFailed', {
            target: targets.SnsTopic(myTopic),
		//	notificationTopic: new sns.Topic(this, 'myTopic'), // optional
      notifyEmails: [
        'ishitasaxena78@yahoo.in',
      ], // optional
	  additionalInformation: 'Build failed',
        });
		project.onBuildSucceeded('BuildSuceed', {
            target: targets.SnsTopic(myTopic),
			//notificationTopic: new sns.Topic(this, 'myTopic'), // optional
      notifyEmails: [
        'ishitasaxena78@yahoo.in',
      ], // optional
	  additionalInformation: 'Build Succeed',
        });
    //approveStage.addAction(manualApprovalAction);*/

    /*const slack = new chatbot.SlackChannelConfiguration(this, 'MySlackChannel', {
      slackChannelConfigurationName: 'Ishita',
      slackWorkspaceId: 'ishitasaxena78',
      slackChannelId: 'ishitasaxena78@yahoo.in',
    });
    const rule = new notifications.NotificationRule(this, 'NotificationRule', {
      source: project,
      events: [
        'codebuild-project-build-state-succeeded',
        'codebuild-project-build-state-failed',
      ],
      targets: [myTopic],
    });
    rule.addTarget(slack);
    //const rule = pipeline.notifyOnExecutionStateChange('NotifyOnExecutionStateChange', target);*/
    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CodeCommit',
      repository,
      output: sourceOutput,
    });
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CodeBuild',
      project,
      input: sourceOutput,
      outputs: [new codepipeline.Artifact()], // optional
      //executeBatchBuild: true, // optional, defaults to false
      //combineBatchBuildArtifacts: true, // optional, defaults to false
    });

    //message
    const failureTopic = new sns.Topic(this, 'BuildFailure', {
      displayName: 'BuildFailure',
    });
    new sns.Subscription(this, 'BuildFailureSubscription', {
      endpoint: 'ishitasaxena78@yahoo.in',
      protocol: sns.SubscriptionProtocol.EMAIL,
      topic: failureTopic,
    });
    new targets.SnsTopic(failureTopic, {
      message: events.RuleTargetInput.fromText(`The Build   ${events.EventField.fromPath('$.detail.build-id')} has     ${events.EventField.fromPath('$.detail.build-status')} see your build log   at ${events.EventField.fromPath('$.detail.additional-information.logs.deep- link')}`,
      ),
    });
    /*codepipeline.onBuildFailed('BuildFailed', {
      target: failureTarget,
    });*/

    new codepipeline.Pipeline(this, 'Sample-Repo-CodePipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Approve',
          actions: [manualApprovalAction],
        },
        {
          stageName: 'Build',
          actions: [buildAction],
        },
      ],
    });
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();

new CodeCommit(app, 'Sample-Repo-CFN', { env: devEnv });
app.synth();
