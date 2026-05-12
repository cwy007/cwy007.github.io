# terminal

## 终端不能正常显示中文

```txt
curl -s "https://whois.pconline.com.cn/ipJson.jsp?ip=192.168.1.2&json=true" | iconv -f gbk -t utf-8
```

终端之所以显示 `` 乱码，是因为太平洋这个旧版 API 接口默认返回的字符编码格式是 **GBK**，而 macOS 终端（Zsh 等）默认的编码格式是 **UTF-8**。编码不一致导致终端无法正常解码中文字符。

想要在终端正常看到中文，我们可以借助系统的 `iconv` 工具，将收到的 GBK 流实时转换成 UTF-8 打印出来。

请在终端尝试运行以下命令（在原地址加个双引号，并在末尾加上管道转码逻辑）：

```bash
curl -s "https://whois.pconline.com.cn/ipJson.jsp?ip=221.237.121.165&json=true" | iconv -f gbk -t utf-8
```

这样就可以正常解析出 `{"ip":"192.168.1.2",..."addr":" 局域网"...}` 之类的中文字段了。如果在 NestJS 代码中使用 `axios` 或 `fetch` 请求它，遇到乱码时同样需要引入如 `iconv-lite` 库来进行 Buffer 二进制流的 GBK 解码操作。
