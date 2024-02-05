#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkDeployGhOidcStack, InfraStack } from '../lib/index';

// デプロイ先のアカウントとリージョン
const env = { account: '905418074681', region: 'ap-northeast-1' };

const app = new cdk.App();
// アプリケーションインフラストラクチャのスタック
new InfraStack(app, 'InfraStack', { env: env });
// フロントエンドのCDCDパイプライン構築用のスタック
new CdkDeployGhOidcStack(app, 'CdkDeployGhOidcStack', { env: env });
