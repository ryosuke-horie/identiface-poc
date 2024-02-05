import { Stack, StackProps, aws_iam } from "aws-cdk-lib";
import { Construct } from "constructs";

const GITHUB_OWNER = "ryosuke-horie";
const GITHUB_REPO = "identiface-poc";
const CDK_QUALIFIER = "hnb659fds"; // 既定値
const S3_BUCKET_NAME = "infrastack-idenfifaces3bucket83b79824-6ttlx45xmxw0";
const CLOUDFRONT_DISTRIBUTION_ID = "E1PPUO0EHG05SG";

/**
 * @description GitHub Actions によるデプロイを許可する OIDC プロバイダーを作成する。
 */
export class CdkDeployGhOidcStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		const accountId = Stack.of(this).account;
		const region = Stack.of(this).region;

		// GitHub とのフェデレーション認証を行う OIDC プロバイダーを作成
		const gitHubOidcProvider = new aws_iam.OpenIdConnectProvider(
			this,
			"GitHubOidcProvider",
			{
				url: "https://token.actions.githubusercontent.com",
				clientIds: ["sts.amazonaws.com"],
			},
		);

		// AssumeRole の引受先を制限する信頼ポリシーを定めたロールを作成
		const gitHubOidcRole = new aws_iam.Role(this, "GitHubOidcRole", {
			roleName: "GitHubOidcRole",
			assumedBy: new aws_iam.FederatedPrincipal(
				gitHubOidcProvider.openIdConnectProviderArn,
				{
					StringEquals: {
						// 引受先の Audience（Client ID）を 'sts.amazonaws.com' に制限。
						"token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
						"token.actions.githubusercontent.com:sub":
							// トリガーを Pull Request に制限。
							`repo:${GITHUB_OWNER}/${GITHUB_REPO}:ref:refs/heads/main`,
					},
				},
				"sts:AssumeRoleWithWebIdentity", // 未指定だと既定で 'sts:AssumeRole' が指定されるため、指定必須。
			),
		});

		// CDK Deploy に必要な権限を定めたポリシーを作成
		const cdkDeployPolicy = new aws_iam.Policy(this, "CdkDeployPolicy", {
			policyName: "CdkDeployPolicy",
			statements: [
				// S3 に関する権限
				new aws_iam.PolicyStatement({
					effect: aws_iam.Effect.ALLOW,
					actions: ["s3:getBucketLocation", "s3:List*"],
					resources: ["arn:aws:s3:::*"],
				}),
				// CloudFormation に関する権限
				new aws_iam.PolicyStatement({
					effect: aws_iam.Effect.ALLOW,
					actions: [
						"cloudformation:CreateStack",
						"cloudformation:CreateChangeSet",
						"cloudformation:DeleteChangeSet",
						"cloudformation:DescribeChangeSet",
						"cloudformation:DescribeStacks",
						"cloudformation:DescribeStackEvents",
						"cloudformation:ExecuteChangeSet",
						"cloudformation:GetTemplate",
					],
					resources: [
						`arn:aws:cloudformation:${region}:${accountId}:stack/*/*`,
					],
				}),
				// S3 に関する権限
				new aws_iam.PolicyStatement({
					effect: aws_iam.Effect.ALLOW,
					actions: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
					resources: [
						`arn:aws:s3:::${S3_BUCKET_NAME}/*`,
					],
				}),
				// SSM に関する権限
				new aws_iam.PolicyStatement({
					effect: aws_iam.Effect.ALLOW,
					actions: ["ssm:GetParameter"],
					resources: [
						`arn:aws:ssm:${region}:${accountId}:parameter/cdk-bootstrap/${CDK_QUALIFIER}/version`,
					],
				}),
				// IAM に関する権限
				new aws_iam.PolicyStatement({
					effect: aws_iam.Effect.ALLOW,
					actions: ["iam:PassRole"],
					resources: [
						`arn:aws:iam::${accountId}:role/cdk-${CDK_QUALIFIER}-cfn-exec-role-${accountId}-${region}`,
					],
				}),
				// CloudFront に関する権限
				new aws_iam.PolicyStatement({
					effect: aws_iam.Effect.ALLOW,
					actions: [
						"cloudfront:GetDistribution",
						"cloudfront:GetDistributionConfig",
						"cloudfront:ListDistributions",
						"cloudfront:ListStreamingDistributions",
						"cloudfront:CreateInvalidation",
						"cloudfront:ListInvalidations",
						"cloudfront:GetInvalidation",
					],
					resources: [
						`arn:aws:cloudfront::851725614224:distribution/${CLOUDFRONT_DISTRIBUTION_ID}`,
					],
				}),
			],
		});

		// OIDC用ロールにポリシーをアタッチ
		gitHubOidcRole.attachInlinePolicy(cdkDeployPolicy);
	}
}
