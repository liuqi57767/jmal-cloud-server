package com.jmal.clouddisk.webdav;

import cn.hutool.core.lang.Console;
import cn.hutool.core.text.CharSequenceUtil;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.jmal.clouddisk.oss.AbstractOssObject;
import com.jmal.clouddisk.oss.OssInputStream;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.catalina.connector.ClientAbortException;
import org.apache.catalina.servlets.WebdavServlet;
import org.springframework.stereotype.Component;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

/**
 * @author jmal
 * @Description WebdavServlet
 * @date 2023/3/27 09:35
 */
@Component
@Slf4j
public class MyWebdavServlet extends WebdavServlet {

    private static final Cache<String, Long> REQUEST_URI_GET_MAP = Caffeine.newBuilder().expireAfterWrite(3L, TimeUnit.SECONDS).build();

    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String method = request.getMethod();
        // 过滤掉mac Finder "._" 文件请求
        if (filterMac(request, response, method)) return;
        // 过滤掉过于频繁的GET请求
        if (filterTooManyRequest(request, response, method)) return;
        super.service(request, response);
    }

    /**
     * 过滤掉mac Finder "._" 文件请求
     */
    private static boolean filterMac(HttpServletRequest request, HttpServletResponse response, String method) throws IOException {
        if (method.equals(WebdavMethod.PROPFIND.getCode()) || method.equals(WebdavMethod.PUT.getCode())) {
            Path path = Paths.get(request.getRequestURI());
            // 过滤掉mac Finder "._" 文件请求
            if (path.getFileName().toString().startsWith("._")) {
                response.sendError(404);
                return true;
            }
        }
        return false;
    }

    /**
     * 过滤掉过于频繁的GET请求, 同一文件1秒内相同GET的请求
     */
    private static boolean filterTooManyRequest(HttpServletRequest request, HttpServletResponse response, String method) throws IOException {
        String uri = request.getRequestURI();
        if (method.equals(WebdavMethod.GET.getCode())) {
            if (!CharSequenceUtil.isBlank(request.getHeader("If-Range")) || !CharSequenceUtil.isBlank(request.getHeader("Range"))) {
                response.sendError(423);
                return true;
            }
            Long time = REQUEST_URI_GET_MAP.getIfPresent(uri);
            if (time != null && (System.currentTimeMillis() - time) < 1000) {
                response.sendError(423);
                return true;
            }
            REQUEST_URI_GET_MAP.put(uri, System.currentTimeMillis());
        }
        return false;
    }

    @Override
    protected void copy(InputStream is, ServletOutputStream outStream) throws IOException {
        IOException exception;
        AbstractOssObject abstractOssObject = null;
        if (is instanceof OssInputStream ossInputStream) {
            abstractOssObject = ossInputStream.getAbstractOssObject();
        }
        InputStream inStream = new BufferedInputStream(is, input);
        exception = copyRange(inStream, outStream);
        if (abstractOssObject != null) {
            try {
                abstractOssObject.closeObject();
            } catch (IOException e) {
                Console.error(e.getMessage());
                exception = new ClientAbortException("Broken pipe");
            } finally {
                try {
                    inStream.close();
                } catch (IOException e) {
                    exception = new ClientAbortException("Broken pipe");
                }
            }
        } else {
            inStream.close();
        }
        if (exception != null) {
            throw exception;
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException, ServletException {
        // Enumeration<String> headerNames = request.getHeaderNames();
        // while (headerNames.hasMoreElements()) {
        //     String name = headerNames.nextElement();
        //     Console.log(name, request.getHeader(name));
        // }
        super.doGet(request, response);
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String uri = req.getRequestURI();
        // 禁止删除oss根目录
        if (uri.endsWith("/jmal/aliyunoss/")) {
            sendNotAllowed(req, resp);
            return;
        }
        super.doDelete(req, resp);
    }


}
