import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import {
  Peer,
  Port,
  SecurityGroup,
  Vpc,
} from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';

export class CodeCommit extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //iam
	 const serviceRole = new iam.Role(this,
      'codebuild-service-role', { assumedBy: new iam.ServicePrincipal('sns.amazonaws.com') });
	   serviceRole.addToPolicy(new iam.PolicyStatement({
		   effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: ['*'],
    }));

    //vpc

    // const vpc = Vpc.fromLookup(this, 'ImportVPC', { isDefault: false });
    const vpc = new Vpc(this, 'my-VPC', {
      maxAzs: 3,
      natGateways: 3,
    });

    //sg
    const sg = new SecurityGroup(this, 'SGS', {
      securityGroupName: 'Codebuild-security-group',
      vpc,
      allowAllOutbound: true,
    });


    sg.addIngressRule(Peer.ipv4('0.0.0.0/0'), Port.tcp(443));
    sg.addIngressRule(Peer.ipv4('0.0.0.0/0'), Port.tcp(80));

    const repository = new codecommit.Repository(this, 'MyRepository', {
      repositoryName: 'Sample-Repo-CodeCommit',
	  //branches: ['master'],
    });
    const project = new codebuild.Project(this, 'Sample-Repo-Codebuild', {
      source: codebuild.Source.codeCommit({ repository }),
	 vpc,
	  buildSpec: codebuild.BuildSpec.fromSourceFilename('project/buildspec.yml'),

      environment: {
        privileged: true,
        computeType: codebuild.ComputeType.MEDIUM,
      },
    });
    repository.onCommit('CommitToMaster', {
    //target: new targets.CodeBuildProject(project),
      branches: ['master'],
    });


    // const project = new codebuild.PipelineProject(this, 'Sample-Repo-CodeBuild',{

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

    new codepipeline.Pipeline(this, 'Sample-Repo-CodePipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
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