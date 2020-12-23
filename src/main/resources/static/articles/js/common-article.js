$(function(){
    // 是否在点击目录
    let clickingToc = false, justLoading = false
    // 目录最大高度
    let tocMaxHeight = 0
    // 页面滚动位置
    let beforeScrollTop
    let scrollAfterTimer = null
    // 目录
    let contents = []
    // 页面主题内容
    let main
    let hasMarkdown,hasHome,isAlonePage
    function loadContent(){
        // 初始化全局参数
        // 是否为文章界面
        hasMarkdown = $('#has-markdown').length > 0
        // 是否为主页
        hasHome = $('#has-home').length > 0
        // 是否为独立页面
        isAlonePage = $('#is-alonePage').length > 0
        main = hasMarkdown ? $('#main_body') : $('.articles_l_main')
        beforeScrollTop = document.documentElement.scrollTop
        console.log('hasMarkdown', hasMarkdown)
        console.log('mark', hasHome)
        if(hasMarkdown) {
            initVditor()
        }
        commonEvent()
    }

    loadContent()

    /***
     * 初始化markdown解析器
     */
    function initVditor(){
        Vditor.preview(document.getElementById('preview'),
            [[${markdown?.contentText}]], {
                hljs: {
                    // 是否显示行号
                    lineNumber: window.innerWidth > 768,
                    style: 'native'
                },
                theme: {
                    current: 'light'
                },
                after() {
                    setContentTheme()
                    // 添加更新时间
                    if(!isAlonePage){
                        addUpdateTime()
                    }
                    // 渲染目录
                    renderContents()
                    setTimeout(function (){
                        // 隐藏加载动画
                        $('#wrap-mask').hide()
                    }, 0)
                    justLoading = true
                    setTimeout(function (){
                        justLoading = false
                        keepTocVisible()
                    }, 800)
                    contentAfter()
                }
            })
    }

    /***
     * 创建目录项
     * 根据最大号标题整体向前移, 例如: 最大号标题为h3,则h3为变为h1,h4变为h2
     */
    function titleOneItem(index, $this, tagName, maxTitleNumber){
        const h = tagName.substring(1,2) - maxTitleNumber
        if(index === 0){
            return '<li first class="pl h-'+h+'" title="'+$this.text()+'"><a href="#'+$this.attr('id')+'"><xmp>'+$this.text()+'</xmp></a></li>'
        }
        return '<li class="pl h-'+h+'" title="'+$this.text()+'"><a href="#'+$this.attr('id')+'"><xmp>'+$this.text()+'</xmp></a></li>'
    }

    /***
     * 在文章最前面添加更新时间
     */
    function addUpdateTime(){
        let preview = document.getElementById('preview')
        let p = document.createElement("p")
        p.className = "note-update-date"
        p.innerText = `本文最后更新于：${[[${markdown?.updateTime()}]]}`
        preview.insertBefore(p , preview.childNodes[0])
    }
    /***
     * 渲染目录
     */
    function renderContents(){
        let headers = $('.article-body').find(":header")
        if(!headers || headers.length < 2){
            $('#main_body').width('100%')
            return
        }
        // 显示目录按钮
        if(window.innerWidth <= 768){
            $('.show-content').css('display','flex')
        }
        // 找出最大号的标题, 默认最小为6号标题(h6)
        let maxTitleNumber = 6
        headers.each(function () {
            const h = $(this).prop("tagName").substring(1,2)
            if(maxTitleNumber > h){
                maxTitleNumber = h
            }
        })
        maxTitleNumber--
        headers.each(function (index) {
            contents.push(titleOneItem(index, $(this), $(this).prop("tagName"), maxTitleNumber))
        })
        $('.j-titleList').prepend(contents)
        // 获取id数组
        for (let i = 0; i < contents.length; i++) {
            contents[i] = contents[i].replace(/.*?#(.*)".*/g, '$1')
        }
        // 去掉id为空的条目
        contents = contents.filter(content => content && content.length > 0)
        if(contents.length > 0){
            $('.right-bj').show()
            $("#main_body").attr("content","show")
            renderContentsAfter(contents)
        } else {
            $("#main_body").attr("content","hide")
        }
    }

    /***
     * 判断上滑还是下滑
     */
    function checkDirection($this){
        let afterScrollTop = document.documentElement.scrollTop
        let delta = afterScrollTop - beforeScrollTop
        beforeScrollTop = afterScrollTop
        let scrollTop = $this.scrollTop()
        let windowHeight = $this.height()
        // //滚动到底部
        if (scrollTop + windowHeight > $(document).height() - 10) {
            afterDirection('bottom')
            return
        }
        if (afterScrollTop < 10 || afterScrollTop > $(document.body).height - 10) {
            afterDirection('up')
        } else {
            if (Math.abs(delta) < 10) {
                return false
            }
            afterDirection(delta > 0 ? "down" : "up")
        }
    }
    /***
     * 上滑或下滑后执行的操作
     */
    function afterDirection (direction) {
        // 判断是上滑显示,下滑隐藏
        const top = $('#top')
        const toggleNav = $('#toggle-nav')
        const body = document.getElementById("body")
        if(direction === 'down'){
            top.removeClass('animateIn')
            top.addClass('animateOut')
            toggleNav.removeClass('animateRight')
            toggleNav.addClass('animateLeft')
            if(body.style.transform.length > 0) {
                document.getElementById("sidebar-nav").style.transform = ''
                body.style.transform = ''
                document.getElementById("toggle-nav").style.transform = ''
            }
        }
        if(direction === 'up'){
            top.removeClass('animateOut')
            top.addClass('animateIn')
            toggleNav.removeClass('animateLeft')
            toggleNav.addClass('animateRight')
        }
    }

    /***
     * 渲染目录后的操作
     */
    function renderContentsAfter(){
        let $root = $('html, body')
        $('.j-titleList li').on("click", function () {
            clickingToc = true
            let top = 75
            if (typeof($(this).attr("first"))!=="undefined") {
                // 点击第一个目录
                top = 168
            }
            let href = $.attr(this.querySelector("a"), 'href')
            $root.animate({
                scrollTop: $(href).offset().top - top
            }, 400)
            setTimeout(function (){
                clickingToc = false
            }, 450)
            return false
        })
        // 滚动到响应的锚点
        setTimeout(function (){
            if(window.location.hash){
                $root.animate({
                    scrollTop: $(decodeURIComponent(window.location.hash)).offset().top - 75
                }, 0)
            }
        },100)
    }

    /***
     * 显示返回顶部按钮
     */
    function showBackTop() {
        if(document.documentElement.scrollTop > 300){
            $('.back-top').fadeIn(500)
        } else {
            $('.back-top').fadeOut(500)
        }
    }
    showBackTop()

    /***
     * 设置目录的最大高度
     */
    function setTocMaxHeight(){
        if(hasMarkdown){
            tocMaxHeight = document.documentElement.clientHeight - 180
            document.body.querySelector('.right-bj .slimScrollDiv>.right-menu').style.maxHeight = tocMaxHeight + 'px'
        }
    }

    /***
     * 目录跟随滚动
     */
    function followScrollToc(){
        if(contents.length < 1){
            return
        }
        if($('.right-bj').offset().top - $(window).scrollTop() <=0 ){
            $('#toc-affix').addClass('affix')
        } else {
            $('#toc-affix').removeClass('affix')
        }
        const tocAction = $('.j-bj')
        for (let i = 0; i < contents.length; i++) {
            if ($(window).scrollTop() > $('#' + contents[i]).offset().top - 100 || $(this).scrollTop() + $(this).height() === $(document).height()) {
                $('.j-titleList').find('li').eq(i).addClass('active').siblings('li').removeClass('active');
                tocAction.css('top', i * 34)
            }
        }
        if(scrollAfterTimer != null){
            clearTimeout(scrollAfterTimer)
        }
        scrollAfterTimer = setTimeout(function (){
            pushHistory()
            keepTocVisible()
        }, 150)
    }
    /***
     * 重设window.history
     */
    function pushHistory() {
        const hash = $('.j-titleList').find('li.active').find('a').attr('href')
        const clientHeight = document.documentElement.clientHeight
        if (hash && $(window).scrollTop() > clientHeight - clientHeight*0.7) {
            window.history.replaceState(null, null, document.location.pathname + hash)
        } else {
            window.history.replaceState(null, null, document.location.pathname)
        }
    }
    /***
     * 保持目录当前相在可见范围内
     */
    function keepTocVisible() {
        if(clickingToc || justLoading){
            return
        }
        const tocAction = $('.j-bj')
        const tocScroll = $('.slimScrollDiv')
        const tocScrollTop = tocScroll.scrollTop()
        const tocHeaderTop = $('.toc-header').offset().top - $(window).scrollTop()
        if (tocHeaderTop > 70 && window.innerWidth > 768) {
            // 隐藏返回顶部按钮
            $('.back-top').fadeOut(500)
        }
        const tocActionTop = tocAction.offset().top - $(window).scrollTop() - tocHeaderTop - 41
        if (tocActionTop > (tocMaxHeight - 40)) {
            tocScroll.animate({
                scrollTop: tocScrollTop + (tocActionTop - tocMaxHeight) + 160
            }, 300)
        }
        if (tocActionTop < 40) {
            let top = Math.abs(tocActionTop) + 160
            tocScroll.animate({
                scrollTop: tocScrollTop - top
            }, 300)
        }
    }

    /***
     * 改变top bar 进度条
     */
    function changeTopBar(){
        let scrollHeight = $(document).height() - window.innerHeight
        let progress = ((document.documentElement.scrollTop)/scrollHeight) * 100
        document.querySelector(".scrollbar").style.width = progress +'%'
    }

    function contentAfter(){
        const slimScrollDiv = $('.slimScrollDiv')
        let startY;
        slimScrollDiv.on('touchstart',function(event){
            //滑动起点的坐标
            startY = event.targetTouches[0].pageY
        });

        // 当目录滚动到达顶部/底部时，防止父元素滚动
        slimScrollDiv.on('DOMMouseScroll mousewheel touchmove', function(ev) {
            let scrollTop = this.scrollTop,
                scrollHeight = this.scrollHeight,
                height = $(this).innerHeight(),
                delta = ev.originalEvent.wheelDelta;
            if (scrollHeight < tocMaxHeight) {
                return
            }

            if(ev.type === 'touchmove'){
                delta = ev.targetTouches[0].pageY - startY
            }
            let up = delta > 0

            let prevent = function() {
                ev.stopPropagation();
                ev.preventDefault();
                if(ev.type !== 'touchmove'){
                    ev.returnValue = false;
                }
                return false;
            }
            if (!up && -delta > scrollHeight - height - scrollTop) {
                // 向下滚动
                $(this).scrollTop(scrollHeight);
                return prevent();
            } else if (up && delta > scrollTop) {
                // 向上滚动
                $(this).scrollTop(0);
                return prevent();
            }
        });

        // 点击显示目录
        $(".show-content").click(function (){
            let translateX = slimScrollDiv.css("transform")
            const reg = '\\((.+?)\\)'
            translateX = parseFloat(translateX.match(reg)[1].split(',')[4])
            if(translateX > 150){
                slimScrollDiv.css("transform", "translateX(0px)")
            }
            if(translateX < 150){
                slimScrollDiv.css("transform", "translateX(250px)")
            }
        })

        main = hasMarkdown ? $('#main_body') : $('.articles_l_main')
    }

    function setContentTheme(){
        const isDark = getThemeCSSName() === 'dark'
        Vditor.setContentTheme(isDark ? 'dark': 'light', 'https://cdn.jsdelivr.net/npm/vditor@3.6.3/dist/css/content-theme')
        Vditor.setCodeTheme(isDark ? 'native': 'github', 'https://cdn.jsdelivr.net/npm/vditor@3.6.3')
    }

    /***
     * 动态打字效果
     */
    let divTyping = $('#article-title')
    let i = 0,timer = 0,str = divTyping.text()
    function typing () {
        if (i <= str.length) {
            divTyping.text(str.slice(0, i++))
            timer = setTimeout(typing, 100)
        } else {
            clearTimeout(timer)
        }
    }
    typing()
    let labelIcon = $('.changeTheme i')
    let labelTitle = $('.changeTheme span')
    // 添加暗色主题
    function addDarkTheme() {
        const themeDark = $('#theme-css-dark')
        if(themeDark.length > 0){
            return
        }
        let link = document.createElement('link');
        link.type = 'text/css';
        link.id = "theme-css-dark";  // 加上id方便后面好查找到进行删除
        link.rel = 'stylesheet';
        link.href = '/articles/css/dark/index.css';
        document.getElementsByTagName("head")[0].appendChild(link);
        labelIcon.removeClass('fa-moon')
        labelIcon.addClass('fa-sun')
        labelTitle.html('亮色')
    }
    // 删除暗色主题
    function removeDarkTheme() {
        const themeDark = $('#theme-css-dark')
        if(themeDark.length > 0){
            themeDark.remove();
            labelIcon.removeClass('fa-sun')
            labelIcon.addClass('fa-moon')
            labelTitle.html('暗色')
        }
    }
    // 使用暗色主题(记录选择到cookie中)
    function useDarkTheme(useDark) {
        setCookie('jmal-theme', useDark ? "dark" : "light");
        if (useDark) {
            addDarkTheme();
        } else {
            removeDarkTheme();
        }
        setContentTheme()
    }
    // 获取cookie中选中的主题名称，没有就给个默认的
    function getThemeCSSName() {
        return getCookie('jmal-theme') || "light";
    }
    $('.changeTheme').click(function (){
        useDarkTheme(getThemeCSSName() === 'light')
    })

    let media = window.matchMedia('(prefers-color-scheme: dark)');
    let callback = (e) => {
        if (e.matches) {
            useDarkTheme(true)
        } else {
            useDarkTheme(false)
        }
    };
    if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', callback);
    } else if (typeof media.addListener === 'function') {
        media.addListener(callback);
    }

    function setCookie(name, value) {
        document.cookie = name + "=" + value + ";path=/";
    }

    function getCookie(cname) {
        let name = cname + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for(let i = 0; i <ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }
    /***
     * 改变返回顶部按钮位置
     */
    function setBackTopPosition(){
        console.log('setBackTopPosition')
        if(!main.offset()){
            return ;
        }
        if(window.innerWidth > 1000){
            $('.back-top').css('left', main.width() + main.offset().left + 15)
        } else if (window.innerWidth > 768 && window.innerWidth < 1000){
            $('.back-top').css('left', main.width() + main.offset().left - 30)
        } else {
            $('.back-top').css('left', '')
        }
    }

    function commonEvent(){
        main = hasMarkdown ? $('#main_body') : $('.articles_l_main')
        setBackTopPosition()
        $(window).on('scroll', function (){
            changeTopBar()
            if(hasHome){
                let scrollTop = $(this).scrollTop()
                if(scrollTop < 480){
                    main.css('margin-top','-'+scrollTop/60+"rem");
                }
            }
            // 判断是上滑还是下滑
            checkDirection($(this))
            // 显示回到顶部按钮
            showBackTop()
            // 目录跟随滚动
            if(hasMarkdown){
                followScrollToc()
            }
        })

        $(window).on("resize", function (){
            setTocMaxHeight()
            setBackTopPosition()
            if(window.innerWidth <= 768){
                $(".rainbow-page").hide()
            }
        })

        // 首页
        if(hasHome) {
            // 首页下拉按钮
            $('.scroll-down-bar').click(function (){
                $('html, body').animate({
                    scrollTop: window.innerHeight * 0.8
                }, 800)
            })

            let main = $('.articles_l_main')
            let scrollTop = $(window).scrollTop()
            if(scrollTop < 480){
                main.css('margin-top','-'+$(window).scrollTop()/60+"rem")
            } else {
                main.css('margin-top','-8rem')
            }
        }

    }

    // 点击回到顶部
    $(".back-top").click(function(){
        $('html, body').animate({
            scrollTop: 0
        }, 400)
    });
});