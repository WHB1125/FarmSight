# FarmSight 数据库迁移指南

本指南将帮助你将 FarmSight 项目从现有的 Supabase 数据库迁移到你自己的新 Supabase 账号。

## 第一步：创建新的 Supabase 项目

1. 访问 https://supabase.com
2. 使用你的邮箱 `wanghanbo1125@163.com` 注册新账号
3. 创建新项目：
   - 项目名称：farmsight（或你喜欢的名称）
   - 数据库密码：设置一个强密码并保存好
   - 区域：选择离你最近的区域（如 Singapore 或 Tokyo）

4. 等待项目创建完成（大约需要 2 分钟）

## 第二步：获取新项目的连接信息

1. 在新项目的 Dashboard 中，点击左侧菜单的 "Project Settings"
2. 点击 "API" 标签页
3. 复制以下信息：
   - **Project URL**（例如：`https://xxxxx.supabase.co`）
   - **anon public key**（一个很长的字符串）

## 第三步：应用数据库迁移

### 方法 A：使用 Supabase SQL Editor（推荐）

1. 在新项目中，点击左侧菜单的 "SQL Editor"
2. 点击 "New query" 创建新查询
3. 依次复制并执行以下迁移文件的内容：

**按顺序执行：**

```
1. supabase/migrations/20251019090839_create_users_with_roles.sql
2. supabase/migrations/20251023045050_create_products_and_prices_tables.sql
3. supabase/migrations/20251024041558_add_product_images_and_chicken.sql
4. supabase/migrations/20251102155418_fix_images_and_add_meat_products.sql
5. supabase/migrations/20251102160114_fix_product_images_final.sql
6. supabase/migrations/20251102160455_fix_cabbage_and_rice_images.sql
7. supabase/migrations/20251102161031_update_cabbage_image_to_local.sql
8. supabase/migrations/20251103042447_create_price_predictions_table.sql
9. supabase/migrations/20251105034325_add_user_favorites_history_and_city.sql
10. supabase/migrations/20251106053002_update_pork_image_to_local.sql
11. supabase/migrations/20251111065635_remove_duplicate_beef_pork_products.sql
```

每个文件执行后，等待显示 "Success. No rows returned" 再执行下一个。

### 方法 B：使用 Supabase CLI（需要安装 CLI）

如果你安装了 Supabase CLI，可以直接运行：

```bash
supabase db push
```

## 第四步：导入数据

1. 在新项目的 SQL Editor 中创建新查询
2. 复制并执行 `data_export.sql` 文件的内容
3. 这将导入所有产品和市场价格数据

注意：用户数据（profiles 表）不会被导入，因为这些是测试账号。你可以在新项目中重新注册。

## 第五步：更新项目配置

1. 在项目根目录找到 `.env` 文件
2. 更新以下内容为你新项目的信息：

```env
VITE_SUPABASE_URL=https://你的新项目URL.supabase.co
VITE_SUPABASE_ANON_KEY=你的新anon-key
```

## 第六步：部署 Edge Function

如果需要市场价格抓取功能，需要重新部署 Edge Function：

1. 在新项目的 Dashboard 中，点击 "Edge Functions"
2. 使用项目中的部署工具或手动创建
3. 相关代码在：`supabase/functions/fetch-market-prices/index.ts`

## 第七步：测试

1. 运行项目：`npm run dev`
2. 尝试注册新账号
3. 查看产品列表和价格数据
4. 测试各个功能是否正常工作

## 数据库架构概览

### 核心表

1. **profiles** - 用户资料表
   - 存储用户信息（姓名、角色、城市等）
   - 链接到 auth.users

2. **products** - 产品表
   - 存储农产品信息（名称、分类、单位、图片等）

3. **market_prices** - 市场价格表
   - 存储每日市场价格数据
   - 按城市、市场、日期记录

4. **price_predictions** - 价格预测表
   - 存储 AI 生成的价格预测

5. **user_favorites** - 用户收藏表
   - 记录用户收藏的产品

6. **price_history** - 价格历史表
   - 记录用户查看的价格历史

## 安全设置

所有表都已启用 Row Level Security (RLS)，并配置了适当的访问策略：

- 用户只能读取和更新自己的资料
- 所有认证用户都可以读取产品和价格数据
- 只有认证用户可以管理自己的收藏和历史记录

## 故障排查

### 问题：迁移执行失败

**解决方案：**
- 确保按照正确顺序执行迁移文件
- 检查是否有语法错误
- 查看 Supabase Dashboard 中的错误日志

### 问题：数据导入失败

**解决方案：**
- 确保所有迁移都已成功执行
- 检查 UUID 是否匹配
- 如果有外键错误，确保关联的数据已经存在

### 问题：应用无法连接数据库

**解决方案：**
- 检查 `.env` 文件中的 URL 和 API Key 是否正确
- 确保没有多余的空格或引号
- 重启开发服务器

## 联系支持

如果遇到问题：
1. 查看 Supabase 官方文档：https://supabase.com/docs
2. 检查项目的 Dashboard 中的日志
3. 在 Supabase Discord 社区寻求帮助

---

**重要提示：**
- 迁移完成后，请妥善保管新项目的数据库密码和 API 密钥
- 定期备份数据
- 不要将 `.env` 文件提交到 Git 仓库
