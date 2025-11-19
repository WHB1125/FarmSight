import { useEffect, useState } from 'react';
import { Download, Share2, Smartphone } from 'lucide-react';

export default function QRCodePage() {
  const [appUrl, setAppUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    const url = window.location.origin;
    setAppUrl(url);

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    setQrCodeUrl(qrUrl);
  }, []);

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'app-qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    alert('链接已复制到剪贴板！');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Smartphone className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              农产品价格预测平台
            </h1>
            <p className="text-gray-600">
              扫描二维码访问应用
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg border-4 border-green-500">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="App QR Code"
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                  <span className="text-gray-400">加载中...</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">应用链接：</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-4 py-2 rounded border text-sm text-gray-800 overflow-x-auto">
                  {appUrl || '加载中...'}
                </code>
                <button
                  onClick={copyUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={downloadQRCode}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Download className="w-5 h-5" />
              下载二维码
            </button>
            <a
              href="/"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              返回首页
            </a>
          </div>

          <div className="mt-8 pt-8 border-t">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">使用说明：</h2>
            <ol className="space-y-3 text-gray-600">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </span>
                <span>使用手机微信或其他扫码工具扫描上方二维码</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </span>
                <span>在浏览器中打开链接访问农产品价格预测平台</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </span>
                <span>使用账号登录，查看实时价格、预测和市场分布</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  4
                </span>
                <span>可以下载二维码图片进行分享或打印</span>
              </li>
            </ol>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>提示：</strong>建议将此页面添加到浏览器书签，方便随时生成和分享二维码。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
