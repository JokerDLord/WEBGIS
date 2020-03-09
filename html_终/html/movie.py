# _*_ coding:utf-8 _*_

import requests
import json
from bs4 import BeautifulSoup

header = {"user-agent" : "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/14.0.835.163 Safari/535.1"}

#url是电影院名字对应的url，整个链接的后半部分，见movie.txt
website = 'https://maoyan.com'
# link = 'https://maoyan.com/cinema/13237?poi=51904564'#测试用代码

def pachong(link):
    #使用代理池
    global header
    resp = requests.get(website + link, headers=header).text
    soup = BeautifulSoup(resp, 'html.parser')
    try:
        #找到所有标签为h3，css是movie-name的元素，返回一个列表
        namelist = soup.find_all('h3',attrs={"class":"movie-name"})
        #获取每一个元素的电影名字
        movie_name = [i.get_text() for i in namelist]
        if namelist != []:
            films = ','.join(movie_name)
        else:
            films = ''
        # return films
        return movie_name
    except Exception:
        # txt = input("Please input another header:")
        # header = {"user-agent": txt}
        return "fail"
