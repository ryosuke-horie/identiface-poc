import {
	// Duration,
	RemovalPolicy,
	Stack,
	StackProps,
	aws_cloudfront,
	aws_cloudfront_origins,
	aws_iam,
	aws_s3,
} from "aws-cdk-lib";
// import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
// import * as route53 from "aws-cdk-lib/aws-route53";
// import * as targets from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";

/**
 * アプリケーションインフラストラクチャのスタック
 */
export class InfraStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// S3バケットを作成する
		const idenfifaceS3Bucket = new aws_s3.Bucket(this, "idenfifaceS3Bucket", {
			removalPolicy: RemovalPolicy.DESTROY,
		});

		// OAIを作成する
		const originAccessIdentity = new aws_cloudfront.OriginAccessIdentity(
			this,
			"OriginAccessIdentity",
			{
				comment: "website-distribution-originAccessIdentity",
			},
		);

		// S3バケットポリシーを作成する。OAIからのみアクセス可能とする
		const idenfifaceS3BucketPolicyStatement = new aws_iam.PolicyStatement({
			// GETのみ許可
			actions: ["s3:GetObject"],
			effect: aws_iam.Effect.ALLOW,
			principals: [
				new aws_iam.CanonicalUserPrincipal(
					originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId,
				),
			],
			resources: [`${idenfifaceS3Bucket.bucketArn}/*`],
		});

		// S3バケットポリシーにステートメントを追加する
		idenfifaceS3Bucket.addToResourcePolicy(idenfifaceS3BucketPolicyStatement);

		// // 利用するホストゾーンをドメイン名で取得
		// // ホストゾーンIDを取得
		// const hostedZoneId = route53.HostedZone.fromLookup(this, "HostedZoneId", {
		// 	domainName: "timetable-hideskick.net",
		// });

		// // 証明書を取得
		// const certificate = Certificate.fromCertificateArn(
		// 	this,
		// 	"Certificate",
		// 	"arn:aws:acm:us-east-1:851725614224:certificate/5b4f1664-f268-4e91-9461-31cccc26f0ca",
		// );

		// CloudFrontディストリビューションを作成する
		const distribution = new aws_cloudfront.Distribution(this, "Distribution", {
			// domainNames: ["timetable-hideskick.net"],
			// certificate,
			comment: "identiface-distribution",
			defaultRootObject: "index.html",
			defaultBehavior: {
				allowedMethods: aws_cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
				cachedMethods: aws_cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
				cachePolicy: aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
				viewerProtocolPolicy:
					aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				origin: new aws_cloudfront_origins.S3Origin(idenfifaceS3Bucket, {
					originAccessIdentity,
				}),
			},
			priceClass: aws_cloudfront.PriceClass.PRICE_CLASS_100,
		});

		// // Route53レコード設定
		// new route53.ARecord(this, "ARecord", {
		// 	zone: hostedZoneId,
		// 	target: route53.RecordTarget.fromAlias(
		// 		new targets.CloudFrontTarget(distribution),
		// 	),
		// 	recordName: "timetable-hideskick.net",
		// });
	}
}
