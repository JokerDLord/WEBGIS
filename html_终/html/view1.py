from flask import render_template, request, Flask, jsonify
import sqlite3 as sql
import json
import movie


#返回数据时候，true用1 false用0 没有数据用-1

app = Flask(__name__)
@app.route("/")
@app.route("/home")
def home():
    return render_template("index.html")


@app.route("/trys",methods=['GET','POST'])
def trys():
    print(1)
    if request.method == "GET":
        getting = request.args.get('mydata')#获得前端得到的数据
        data = {"name": getting, "that":" is inevitable"}
        print(data)
        return jsonify(data)


@app.route("/querymovies", methods=["POST", "GET"])
def queryMovies():  # 显示电影海报的函数
    if request.method == "POST": # 获取请求的参数
        getting = request.form
    elif request.method == "GET":
        getting = request.args
    print(getting)
    name = getting.get("name")
    link = ''
    with open("link.txt", encoding="utf-8") as f:
        lines = f.readlines() # 打开存放所有链接的文件
        for line in lines[1:]: # 遍历所有的链接，逐一将链接对应的影院名与查询的影院名进行比对
            info = line.strip().split(',')
            if info[1] == name:
                link = info[0]
                break
    if link == "": # 没有查询到该电影院的链接
        result = "fail"
    else:
        result = movie.pachong(link)
    print(result)
    if result == "fail":
        return json.dumps({"result": "fail"})
    else: # 成功
        return json.dumps({"result": "success", "contents": result})


@app.route("/query", methods=["POST", "GET"])
def query():
    if request.method == "POST":
        getting = request.form
    elif request.method == "GET":
        getting = request.args #返回的是一个json文件，记录了formField作为键的信息

    #form中有以下啊字段
    formField = ["lowPrice","highPrice","wifi","park","glasses","rank5","rank45","rank4","adname"]#"averagePrice",
    requestDist = {} 
    print(getting)
    for item in formField:
        field = getting.get(item)
        if (field is not None) and field != "":#
            requestDist[item] = field
    print(requestDist)
    #组装SQL语句example: SELECT * FROM cinemas WHERE name LIKE '%珠影沪亚国际影城%' 
    # AND price >= 10  AND price <= 50  AND rank = '5'
    queryString = getQueryString(requestDist) #获取SQL查询语句用于查询
    print(queryString)
    with sql.connect("cinemas.db") as conn:
        try:
            c = conn.cursor()
            c.execute(queryString)
            resultCinema = [row for row in c]#将获取结果变为列表
            fields = ['name', 'x', 'y', 'adcode', 'adname', 'address',
                        'rank', 'price', 'score1', 'score2', 'score3', 'halls',
                        'seats', 'hallType', 'glasses', 'credit',
                        'ticketMachine', 'wifi', 'park', 'disable',
                        'food', 'recreation']
            result = ToJSON(fields,resultCinema) #result是一个JSON
        except Exception as e:
            return json.dumps({"success":False,"error":repr(e)})
        return result


def ToJSON(fields,cinemas):
    # json例子：{"success":Flase,"content":[{'name':"珠影沪亚国际影城",'x':略,'y':略}, {},{} ......]}
    # content列表元素为字典，每个字典代表一家影院，其中的键值对是各个字段及其值
    JSON = {"success":True}
    content = []
    for row in cinemas:#遍历查询得到的影院
        cinema={}
        for i in range(len(fields)):
            cinema[fields[i]] = row[i] #将影院字段以键值对形式加入字典中
        content.append(cinema)

    JSON["content"] = content
    return json.dumps(JSON)#返回json对象

def getQueryString(dis):#这里暂时只放了最高价和最低价的查询
    sentence = []
    #将选中星级变成列表，根据选中的不同组装语句
    ranklst = []
    rankdict = {"rank5": "五星商户", "rank45":"准五星商户", "rank4":"四星商户"}
    for field in dis.keys():
        # if field == 'name':
        #     sentence.append(" name LIKE '%" + dis['name'] + "%' ")
        if field == 'averagePrice':
            continue
        elif field == 'lowPrice':
            sentence.append(' price >= ' + dis['lowPrice'] + ' ')
        elif field == 'highPrice':
            sentence.append(' price <= ' + dis['highPrice'] + ' ')
        # elif field == 'rank':
        #     sentence.append(" rank = '" + dis['rank'] + "' ")
        elif field[:4] == 'rank':
            ranklst.append(field)
        elif field == "adname":
            sentence.append(' adname = ' + dis['adname'] + ' ')
        else:
            sentence.append(' ' + field + ' = 1 ')
    if len(ranklst) == 3:
        sentence.append(' (rank = "'+ rankdict[ranklst[0]] + '" or rank = "'+rankdict[ranklst[1]]+ '" or rank = "'+rankdict[ranklst[2]]+'") ')
    elif len(ranklst) == 2:
        sentence.append(' (rank = "'+ rankdict[ranklst[0]] + '" or rank = "'+rankdict[ranklst[1]]+'") ')
    elif len(ranklst) == 1:
        sentence.append(' (rank = "'+ rankdict[ranklst[0]]+'") ')

    if len(sentence) == 0:
        return "SELECT * FROM cinema"
    
    return "SELECT * FROM cinema WHERE " + " AND ".join(sentence)

if __name__ == "__main__":
    app.run(debug=True)
