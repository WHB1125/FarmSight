-- ============================================================================
-- FarmSight 数据导出
-- ============================================================================
-- 本文件包含所有核心数据的 INSERT 语句
-- 注意：不包括用户数据（profiles），因为这些是测试账号
--
-- 执行顺序：
-- 1. 先执行所有迁移文件（创建表结构）
-- 2. 再执行本文件（导入数据）
-- ============================================================================

-- 清空现有数据（如果需要重新导入）
-- TRUNCATE market_prices CASCADE;
-- DELETE FROM products;

-- ============================================================================
-- 产品数据 (Products)
-- ============================================================================

INSERT INTO products (id, name, category, unit, description, image_url, created_at, updated_at)
VALUES
  ('079f645d-d27d-4bca-806b-32754ed28747', 'Pears', 'Fruits', 'kg', 'Fresh pears', 'https://images.pexels.com/photos/568471/pexels-photo-568471.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-10-23 04:50:51.378186+00', '2025-11-02 16:01:15.988229+00'),
  ('10f96609-a748-4685-a171-1ef0da7f834a', 'Tomatoes', 'Vegetables', 'kg', 'Fresh tomatoes', 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-10-23 04:50:51.378186+00', '2025-10-24 04:15:59.464013+00'),
  ('13dfc88c-b544-47af-bdec-fb798b4b2b65', 'Wheat', 'Grains', 'kg', 'Wheat grain', 'https://images.pexels.com/photos/2589457/pexels-photo-2589457.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-10-23 04:50:51.378186+00', '2025-10-24 04:15:59.464013+00'),
  ('31515b50-9bb8-4b20-bed9-c25e91232eeb', 'Corn', 'Grains', 'kg', 'Sweet corn', 'https://images.pexels.com/photos/547263/pexels-photo-547263.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-10-23 04:50:51.378186+00', '2025-11-02 15:54:20.110796+00'),
  ('3d59e6a5-2fe3-42f8-b2b3-0034a0d2067f', 'Rice', 'Grains', 'kg', 'White rice', 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-10-23 04:50:51.378186+00', '2025-11-02 16:04:56.412321+00'),
  ('46968e4f-c2a2-4d98-90ea-f4fc78c59415', 'Apples', 'Fruits', 'kg', 'Fresh apples', 'https://images.pexels.com/photos/1510392/pexels-photo-1510392.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-10-23 04:50:51.378186+00', '2025-10-24 04:15:59.464013+00'),
  ('51d21411-0727-4e32-a128-2de0ebe144e6', 'Pork', 'Meat', 'kg', 'Fresh pork', '/pork.jpg', '2025-11-02 16:01:15.988229+00', '2025-11-06 05:30:03.978106+00'),
  ('668d21c3-54a7-48d0-8a10-1a1ff0e7d420', 'Carrots', 'Vegetables', 'kg', 'Fresh carrots', 'https://images.pexels.com/photos/3650647/pexels-photo-3650647.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-10-23 04:50:51.378186+00', '2025-10-24 04:15:59.464013+00'),
  ('821ae35b-15a1-4372-9c88-3e2652cd2613', 'Potatoes', 'Vegetables', 'kg', 'Fresh potatoes', 'https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-10-23 04:50:51.378186+00', '2025-10-24 04:15:59.464013+00'),
  ('8df5afee-e5d3-472e-a52f-7b105ffc1d20', 'Cabbage', 'Vegetables', 'kg', 'Chinese cabbage', '/OIP-C.jpg', '2025-10-23 04:50:51.378186+00', '2025-11-02 16:10:32.851387+00'),
  ('907dd35b-56a9-4b99-acfe-4b181c24a691', 'Beef', 'Meat', 'kg', 'Fresh beef', 'https://images.pexels.com/photos/618775/pexels-photo-618775.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-11-02 16:01:15.988229+00', '2025-11-02 16:01:15.988229+00'),
  ('ab26fd80-05bd-4ccf-a47b-b7a017cdb32c', 'Chicken', 'Meat', 'kg', 'Fresh chicken', 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-10-24 04:15:59.464013+00', '2025-10-24 04:15:59.464013+00'),
  ('e399fd2d-3632-4c09-b7b2-8fb59a59ae19', 'Cucumbers', 'Vegetables', 'kg', 'Fresh cucumbers', 'https://images.pexels.com/photos/2329440/pexels-photo-2329440.jpeg?auto=compress&cs=tinysrgb&w=400&h=400', '2025-10-23 04:50:51.378186+00', '2025-10-24 04:15:59.464013+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 市场价格数据 (Market Prices)
-- ============================================================================
-- 注意：这个数据库有 34,580 条市场价格记录
-- 由于数据量太大，这里只提供导出方法的示例
--
-- 方法 1：使用 Supabase Dashboard 导出
-- 1. 进入旧项目的 Table Editor
-- 2. 选择 market_prices 表
-- 3. 点击右上角的 "..." 菜单
-- 4. 选择 "Download as CSV"
-- 5. 在新项目中使用 "Import from CSV" 导入
--
-- 方法 2：使用 SQL 导出（如果数据量不大）
-- 可以在 SQL Editor 中运行以下查询生成 INSERT 语句：
--
-- SELECT 'INSERT INTO market_prices (id, product_id, city, market_name, price, price_unit, date, source, created_at) VALUES'
-- UNION ALL
-- SELECT '  (''' || id || ''', ''' || product_id || ''', ''' || city || ''', ''' ||
--        market_name || ''', ''' || price || ''', ''' || price_unit || ''', ''' ||
--        date || ''', ''' || source || ''', ''' || created_at || '''),'
-- FROM market_prices
-- ORDER BY date, product_id
-- LIMIT 1000;
--
-- 方法 3：使用脚本批量导出
-- 项目中已有 export_full.mjs 脚本可以导出数据
-- ============================================================================

-- 如果你的市场价格数据较少（比如只有几百条），可以直接使用 INSERT 语句
-- 这里提供一个示例（最近的一些数据）：

-- 取消下面的注释来导入示例数据
/*
-- 示例：最近的市场价格数据将在这里
-- 由于数据量太大，建议使用上述方法 1 或 2 进行导出导入
*/

-- ============================================================================
-- 验证导入
-- ============================================================================
-- 导入完成后，运行以下查询验证数据：

-- SELECT COUNT(*) as product_count FROM products;
-- SELECT COUNT(*) as price_count FROM market_prices;
-- SELECT DISTINCT category FROM products;
-- SELECT COUNT(DISTINCT city) as city_count FROM market_prices;

-- ============================================================================
-- 完成
-- ============================================================================
-- 数据导入完成！
--
-- 下一步：
-- 1. 更新 .env 文件中的 Supabase URL 和 API Key
-- 2. 重新注册用户账号
-- 3. 测试应用功能
-- ============================================================================
