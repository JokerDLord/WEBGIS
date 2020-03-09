var map;
var zoom = 14;
var allData;
var pages = 0;
var currPage = 1;
var items = 4; // 控制一行显示多少个
var markers = new Array();
var icons = new Array();
var blueMarkers = new Array();
var redMarkers = new Array();
var icon_5;
var icon_4;
var icon_45;
var icon_near;
var favorite;
var showdata;
var AvailableMovies = ["半个喜剧","解放·终局营救","罗宾汉：起源","特警队","误杀","星球大战：天行者崛起","叶问4：完结篇"];

function onLoad() {
    // 初始化
    map = new T.Map("map", {
        projection:"EPSG:4326"
    });
    map.centerAndZoom(new T.LngLat(121.489035,31.239127), zoom);
    // 设置不能缩小太小，同时不超出上海市的范围(此处最好不进行设置)
    map.setMinZoom(10);
    //map.setMaxBounds(new T.LngLatBounds(new T.LngLat(120.5, 32), new T.LngLat(121.98, 30.67)));
    //创建比例尺控件对象
    var scale = new T.Control.Scale();
    //添加比例尺控件
    map.addControl(scale);
    // 鹰眼控件
    var miniMap = new T.Control.OverviewMap({
    	isOpen: true,
        size: new T.Point(200, 200)
        });
    map.addControl(miniMap);
    var miniMapPosition = T_ANCHOR_BOTTOM_RIGHT;
	miniMap.setPosition(miniMapPosition);
    //get the favorite
    if(localStorage.getItem("favorite")==null) 
        {
            favorite=new Array();
        }
    else{
            favorite=JSON.parse(localStorage.getItem("favorite"))["content"];
        }  
    
    
    //icon对象
    //marker for cinemas with 5 stars
    icon_5 = new T.Icon({
        iconUrl: "/static/icons/star5.png",
        iconSize: new T.Point(35, 35),
        iconAnchor: new T.Point(17, 35)
    });
    //marker for those with 4.5 stars
    icon_45 = new T.Icon({
        iconUrl: "/static/icons/star45.png",
        iconSize: new T.Point(35, 35),
        iconAnchor: new T.Point(17, 35)
    });
    //marker for those with 4 stars
    icon_4 = new T.Icon({
        iconUrl: "/static/icons/star4.png",
        iconSize: new T.Point(35, 35),
        iconAnchor: new T.Point(17,35)
    });
    //marker for those near my location
    icon_high = new T.Icon({
        iconUrl: "/static/icons/highlight.png",
        iconSize: new T.Point(40, 40),
        iconAnchor: new T.Point(20,40)
    });
}

function showQueryData()
{
	$.ajax({ // WebGIS课上，这个地方是 XMLHttpRequest?
		// 但是那个好像不适用于IE浏览器 而这个$.ajax是全部浏览器通用的
		method: "post",
		data: $("#query").serialize(), // 这个函数用于获取表单里的所有数据
		url: "query",
		success: function(rawData){
            // rawData 是flask 传回的一个JSON 具体请看views.py里的query函数
            allData = JSON.parse(rawData);
            showdata  = allData;
            if(allData.success) //如果查询结果为True
            {
                map.clearOverLays();//每次成功查询 都会清除之前页面所有的overlays
                allData = allData.content;//content 赋给alldata
                show(allData);//show函数懒得改了 此处还是直接将showdata这个object直接传入show中
            }
                
			else
			{
				window.alert(allData.error); // 报错！
				return;
			}

			// 计算有多少页
			pages = Math.ceil(allData.length / items);			
            if(pages == 0)
            {
                window.alert("抱歉，没有符合条件的记录！");
            }
            else
            {
                $("#results").show(1000); // 有过渡效果的显示结果框 1000ms
                showPage(1); //显示第一页
                $("#totalPages").text(String(pages)); // 显示一共有多少页
            }
		}
	})
}

function showPage(page)
{
    // 显示第page页的内容
	if(page > pages || page <= 0) // 如果输入的数据不合法，就不进行任何操作
		return;
	currPage = page;//记录目前翻到的页数
	var num = 1;//表示目前这一页里，当前信息的序号（1,2,3,4）
	var resultDiv = document.getElementById("resultContents");//定位到结果框
    resultDiv.innerHTML = ""; // 先清空结果框里面的东西
    var extent = new Array();//用于存储页面上各个电影院的地理位置，用以回找extent

    ////////////////////////////
    /////此处icon高亮的逻辑为每一页的四个icon高亮并改变大小，其他时候不变
    //首先更改icon图标,将所有图标都重置为原本颜色的图标
    setOriginIcon();
    //小循环一下 将当前页的电影院icon置为high型的
    for(var i = (page - 1) * items; i < Math.min(page*items,allData.length); i++)
    {
        var marker = markers[i];
        //更改icon为highlight型
        marker.setIcon(icon_high);
    }

	for(var i = (page - 1) * items; i < allData.length; i++)//循环这一页对应的各条信息
    // 因为一页显示的信息条数是固定的，比如说第7页，1页5条，第7页之前就一定有6*5=30条
    // 因此，第7页需要显示第31条以及之后的信息
	{
        //将坐标加入extent数组中 并通过addmark创建点
        var longlat = new T.LngLat(parseFloat(allData[i].x),parseFloat(allData[i].y))
        extent[num] = longlat;
        
        var div = document.createElement("div"); // 创建一个包含了所有信息（名字，星级，价格,...）的div
        div.id = "info-" + String(i); // 设置他的id 注意此处是i不是num 所有的div都会有一个独立的id值
        div.className = "row"; // bootStrap的对齐系统，需要中间层div的class是row
        /* Bootstrap带的对齐是这样的：
        <div class="container">
            <div class="row">
                <div class="col ...">      <-- 一列
                <div class="col ...">      <-- 另一列
            </div>
        </div>
        */

		var name = document.createElement("h6"); // 影院名
		name.innerText = String(num) + ". " + allData[i].name;

        var price = document.createElement("span"); // 人均价格
        price.className = "col-xs-4"; // bootStrap规定，col-xs-4 表示这个div占一行4/12=1/3的宽度
        var tmpStr = "人均： ";
        tmpStr += allData[i].price == "-1" ? "-" : String(allData[i].price);
        //如果是-1的话，表明数据库中并没有记录这个影院的均价，因此用一个横线代替
        tmpStr += " 元\t\t";
        price.innerText = tmpStr;

        var score = document.createElement("span"); // 3项评分
        score.className = "col-xs-8"; // bootStrap规定，col-xs-8 表示这个div占一行8/12=2/3的宽度
        // 所以和人均价格可以在一行里显示，并且评分也是竖向对齐的，不受人均价格的宽度的影响
        tmpStr = "评分：";
        tmpStr += (allData[i].score1 == "-1" ? "-" : //同样，如果是-1的话，表明数据库中没有记录，因此用一个横线代替
                  (allData[i].score1 + "  " + allData[i].score2 + "  " + allData[i].score3));
        score.innerText = tmpStr;

        var stars = document.createElement("div"); // 星级，直接用图标表示 https://www.cnblogs.com/sxs161028/p/7249966.html
        stars.className = "col-xs-12 cleanfloat starFive sF";
        // 这个col-xs-12，表示宽度占一行12/12=1/1的宽度，如果把这个去掉的话，他就不能和人均价格竖向对齐了。
        switch(allData[i].rank)
        {
            case "五星商户":
                stars.innerHTML = "<span class='org_star'>★</span><span class='org_star'>★</span><span class='org_star'>★</span><span class='org_star'>★</span><span class='org_star'>★</span>";
                break;
            case "准五星商户":
                stars.innerHTML = "<span class='org_star'>★</span><span class='org_star'>★</span><span class='org_star'>★</span><span class='org_star'>★</span><span data-content='★'>★</span>"
                break;
            case "四星商户":
                stars.innerHTML = "<span class='org_star'>★</span><span class='org_star'>★</span><span class='org_star'>★</span><span class='org_star'>★</span><span>★</span>";
                break;
            case "准四星商户":
                stars.innerHTML = "<span class='org_star'>★</span><span class='org_star'>★</span><span class='org_star'>★</span><span  data-content='★'>★</span><span>★</span>";
                break;
        }

        var services = document.createElement("div"); // 提供的服务
        services.className = "col-xs-12"; //同上， 
        // 这个col-xs-12，表示宽度占一行12/12=1/1的宽度，如果把这个去掉的话，他就不能和人均价格竖向对齐了。
        services.innerText = genIcons(allData[i]); //这个函数在164行
        //<input style='margin-left:195px;  width: 80px;height: 24px; text-align: center; background: #5596de;color: #FFF;border: none;display: block;cursor: pointer;' type='button' value='加入收藏夹'  onClick="Favor(showdata)">
        //alert("here")
        //var button=document.createElement("div");
        //button.innerHTML="<input style='margin-left:195px;  width: 80px;height: 24px; text-align: center; background: #5596de;color: #FFF;border: none;display: block;cursor: pointer;' type='button' value='加入收藏夹'  onClick="Favor(showdata[i])">";
        //button.classname="col-xs-12";

		div.appendChild(name); // 把上面各项都装到div里
        div.appendChild(price);
        div.appendChild(score);
        div.appendChild(stars);
        div.appendChild(services);
        //div.appendChild(button);
        resultDiv.appendChild(div); // 把这个包含所有信息的div，加到结果框的div里面
        var bar = document.createElement("hr"); // 创建一条横线
        resultDiv.appendChild(bar); // 横线也加到结果框的div里面 //一个div一条横线一个影院信息

        //设置鼠标移动到div上面的效果
        div.innerID = i;
        $(div).mouseover(
            function()
            {
                syncHighlight(this,true);
                map.panTo(markers[this.innerID].getLngLat());
            }
        );
        $(div).mouseleave(
            function()
            {
                syncHighlight(this,false);
            }
        );
        $(div).on("dblclick",function()
        {
            //双击，将地图中心移动到该marker的坐标
            map.panTo(markers[this.innerID].getLngLat(),16)
        });


        if(num == items) break;//如果达到了一页显示信息数量的上限，就跳出循环
        num++; //否则就处理下一个序号
    }
    //根据extent里的坐标，找到正确的view范围让地图缩放至合适级别
    var view = map.getViewport(extent);
    map.centerAndZoom(view.center,view.zoom-1);

    // 循环结束后，显示当前的页码
	$("#currPage").text(String(page));
}


//根据state高亮or取消高亮显示 包括div和marker
function syncHighlight(div,state){
    if(state)
    {
        $("#info-"+String(div.innerID)).css("background-color","#FCAA67") //更改div的样式配色#BBB
        var marker = markers[div.innerID];
    }
    else
    {
        $("#info-"+String(div.innerID)).css("background-color", "#FFF");
        var marker = markers[div.innerID];
    }
}

function setOriginIcon(){
    for(var i=0;i<markers.length;i++)
    {
        markers[i].setIcon(icons[i]);
    }
}



function turnPage(direction)
{
	showPage(currPage + direction);
}

function genIcons(info)
{
    var results = "";
    if(info.wifi == 1) //根据结果里面的属性，把提供什么服务所对应的字符串拼接起来
        results += "有Wifi\xa0\xa0";
    if(info.park == 1)
        results += "有停车场\xa0\xa0";
    if(info.glasses == 1)
        results += "有免费3D眼镜";
    return results;
}

function clearQueryData()
{
	$("#reset").trigger('click'); // 点击reset按钮
	$("#results").hide(500);      // 隐藏搜索结果框
    map.clearOverLays();
}

///////////////////////
// 格式化字符串的思路
String.prototype.format = function () {
    var values = arguments;
    return this.replace(/\{(\d+)\}/g, function (match, index) {
        if (values.length > index) {
            return values[index];
        } else {
            return "";
        }
    });
};　
    　


// 将存取款机等信息转换为符号
function change(con){
    if(con==0){return "×";}
    else{return "√";}
}

function removeOne(content)
{
    // 将-1转换为横线
    if(content == "-1") return "-";
    else return content;
}

/*localStorage.setItem("coffeeType", "mocha");    
localStorage.setItem("coffeePrice", "28");     
verify();   //验证本地存储    
localStorage.removeItem("coffeeType");    
verify();   //验证coffeeType是否存在    
localStorage.clear();    
verify();   //验证coffeeType和coffeePrice是否存在     
//自定义验证函数，验证coffeeType和coffeePrice的数据是否存在    
function verify(){        
    var type = localStorage.getItem("coffeeType");        
    var price = localStorage.getItem("coffeePrice");        
    type = type ? type : '不存在';        
    price = price ? price : '不存在';         
    alert( "coffeeType: " + type + "\n\n" + "coffeePrice: " + price );    
}*/

//show the cinemas in the favorite
function showfavor()
{
    var fav=JSON.parse(localStorage.getItem("favorite"));
    if(fav!=null){
        clearQueryData();
        show(fav["content"]);
        //alert(fav["content"].length);
    }
    else{
        alert("none");
    }
}

function show(content)
{
    console.log(content);
    //var allcontent=json["content"];//读取所有记录,读取到的结果为列表
    //对每一条记录进行处理
    for(var i=0;i<content.length;i++)
    {
        //获取每一项信息
        name=content[i]["name"];
        lng=content[i]["x"];
        lat=content[i]["y"];
        adcode=content[i]["adcode"];
        adname=content[i]["adname"];
        address=content[i]["address"];
        rank=removeOne(content[i]["rank"]);
        price=removeOne(content[i]["price"]);
        score1=removeOne(content[i]["score1"]);
        score2=removeOne(content[i]["score2"]);
        score3=removeOne(content[i]["score3"]);
        hallsnum=removeOne(content[i]["halls"]);
        halltype=removeOne(content[i]["hallType"]);
        seats=removeOne(content[i]["seats"]);
        glasses=change(content[i]["glasses"]);
        credit=change(content[i]["credit"]);
        ticketMachine=change(content[i]["ticketMachine"]);
        wifi=change(content[i]["wifi"]);
        park=change(content[i]["park"]);
        disable=change(content[i]["disable"]);
        food=change(content[i]["food"]);
        recreation=change(content[i]["recreation"]);
        //创建标注对象
        // var marker = new T.Marker(new T.LngLat(lng, lat));
        switch(rank)
                {
                    case "四星商户":
                        var marker = new T.Marker(new T.LngLat(lng, lat),{icon: icon_4});
                        break;
                    case "准五星商户":
                        var marker = new T.Marker(new T.LngLat(lng, lat),{icon: icon_45});
                        break;
                    default:
                        var marker = new T.Marker(new T.LngLat(lng, lat),{icon: icon_5});
                }

        marker.innerID = i//给每个marker添加一个ID
        // //给marker添加鼠标移入、移出、双击、的监听事件
        // marker.addEventListener("mouseover",function(e)
        // {
        //     syncHighlight(e.target,true);//.this和event.target都是dom对象//event.target不会变化，是直接接受事件的目标DOM元素；
        // })
        // marker.addEventListener("mouseout",function(e)
        // {
        //     syncHighlight(e.target,false);
        // })//此处给marker添加mouseover、mousemove事件并不友好，遂作罢
        marker.addEventListener("dblclick",function(e)
        {
            map.panTo(e.lnglat,16);
        });
        markers[i] = marker;//将marker加入数组中
        icons[i] = marker.getIcon();//将marker显示所用的图标对象放入数组中
        
        addClickHandler2(marker,content[i]);
        
        //向地图上添加标注
        map.addOverLay(marker);// 将标注添加到地图中
        var sContent =
            "<div style='margin:0px;font-size:18px;font-weight:bold;padding:2px;border-style:none none solid none;border-bottom:0.5px solid;'>{0}</div>".format(name)+
            "<div style='margin-top:8px;margin-bottom:8px;font-size:13px;font-weight:normal;'>地址：{0}</div>".format(address)+
            "<div style='margin-bottom:8px;border-style:none none none solid;border-left:2px solid Crimson;font-size:14px;color:Crimson;padding:5px;background-color:AliceBlue;'>评级:{1}<br>{2}\t|\t{3}\t|\t{4}</div>" .format(address,rank,score1,score2,score3)+
            "<div style='margin-bottom:8px;border-style:none none none solid;border-left:2px solid MediumBlue  ;font-size:14px;color:MediumBlue  ;padding:5px;background-color:AliceBlue;'>人均:{0}元<br>放映厅数量:{1}, 座位总数:{2}<br>放映厅类型:{3}</div>".format(price,hallsnum,seats,halltype)+
            "<div style='margin-bottom:8px;border-style:none none none solid;border-left:2px solid DarkGreen ;font-size:14px;color:DarkGreen;padding:5px;background-color:AliceBlue;'>提供3D眼镜{0}\t可信用卡支付{1}\t自助售票机{2}<br>免费WIFI{3}\t提供停车场{4}\t残疾人士友好{5}<br>食品出售{6}\t娱乐设施{7}</div>".format(glasses,credit,ticketMachine,wifi,park,disable,food,recreation)+
            "<div style='margin-left:170px;color: #5596de;'>单击标注可添加收藏~</div>";
        addClickHandler(sContent,marker, name);
    };
    function addClickHandler2(marker,content)
    {
            marker.addEventListener("click",function(e){
                savefav(content,e)}
            );
    }
    function savefav(content,e)
    {
        favorite.push(content);
        var json_fav={"content":favorite};
        localStorage.setItem("favorite",JSON.stringify(json_fav));
        console.log(json_fav);
        var point = e.lnglat;
        marker = new T.Marker(point);// 创建标注
        var markerInfoWin = new T.InfoWindow("收藏成功！",{offset:new T.Point(0,-30)}); // 创建信息窗口对象
        map.openInfoWindow(markerInfoWin,point); //开启信息窗口
    }
    function addClickHandler(content,marker,name){
            marker.addEventListener("mouseover",function(e){
                openInfo(content,e,name)}
            );
        }
    function openInfo(content,e,cinemaName){
        var point = e.lnglat;
        marker = new T.Marker(point);// 创建标注
        var markerInfoWin = new T.InfoWindow(content,{offset:new T.Point(0,-30)}); // 创建信息窗口对象
        map.openInfoWindow(markerInfoWin,point); //开启信息窗口
        // ================================================
        // 以下，为增加的内容： 显示页面右上角的DIV
        $.ajax({
            method:"post",
            data: {name: cinemaName},
            url:"querymovies",
            success:function(rawData)
            {
                data = JSON.parse(rawData);
                if(data["result"] == "success")
                {
                    $("#movieshow").show(500);
                    // 一个个的往这个div里面加电影海报。思路类似于showPage这个函数
                    var container = document.getElementById("movieposter");
                    container.innerHTML = "";
                    data["contents"].forEach(function(movieName)
                    {
                        if (AvailableMovies.indexOf(movieName) != -1)
                        {
                            var img = document.createElement("img");
                            img.src = "/static/img/" + movieName + ".jpg";
                            img.className = "col-xs-12";
                            img.src = "/static/img/" + movieName + ".jpg";
                            var h5 = document.createElement("h5");
                            h5.innerText = movieName;
                            h5.style = "text-align: center";
                            h5.className = "col-xs-12";
                            container.appendChild(img);
                            container.appendChild(h5);
                        }    
                    })
                    // 当关闭窗口的时候，同时也关闭显示电影的div.
                    markerInfoWin.addEventListener("close", function(target, lnglat)
                    {
                        $("#movieshow").hide(500);
                    });
                }
            }
        });
        
        // ================================================
    };
}
