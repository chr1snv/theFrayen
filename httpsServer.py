
import asyncio
import http.server
import threading
import ssl
import sys
import time
from datetime import datetime, timezone
import io
import re
import os

from netifaces import interfaces, ifaddresses, AF_INET


certfile = "cert.pem"
keyfile = "key.pem"

def get_ssl_context(certfile, keyfile):
	context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
	context.load_cert_chain(certfile, keyfile)
	context.set_ciphers("@SECLEVEL=1:ALL")
	return context


############
#concurrent / threaded http server for serving the html page
############


class HTTPAsyncHandler(http.server.SimpleHTTPRequestHandler):
	def __init__(self, request, client_address, server):
		#enable http 1.1 to avoid tls and tcp setup time per request by 
		self.protocol_version = 'HTTP/1.1' #keeping connections open until calling self.finish()
		try:
			super().__init__(request, client_address, server)
		except Exception as e:
			None

	def replyWithFile(self, filePath):
		f = open(os.getcwd() + os.path.sep + filePath, 'rb')
		self.send_response(200)
		if filePath.endswith('.js'):
			self.send_header('Content-type','application/javascript')
		if filePath.endswith('.ogg'): #https://devdoc.net/web/developer.mozilla.org/en-US/docs/Configuring_servers_for_Ogg_media.html
			self.send_header('Content-type','audio/ogg')
		else:
			None #self.send_header('Content-type','text/html')
		self.end_headers()
		self.wfile.write(f.read())#.encode('utf-8'))
		f.close()
		self.finish() #https://stackoverflow.com/questions/6594418/simplehttprequesthandler-close-connection-before-returning-from-do-post-method

	def do_GET(self):
		global cmds
		
		try:
			#print("get path " + self.path )
			parts = re.split(r"[/?&=]", self.path)
			print('parts %s ' % str(parts) )
			filePath = parts[1]
			for i in range(2, len(parts)):
				filePath += "/" + parts[i]
			print(filePath)
			self.replyWithFile(filePath)

		except Exception as e:#@IOError:
			print(e)
			#self.send_error(404,'File Not Found: %s' % self.path)


svrIp = '127.0.0.1'
def getIp():
	currentIp = '127.0.0.1'
	for ifaceName in interfaces():
		addresses = [i['addr'] for i in ifaddresses(ifaceName).setdefault(AF_INET, [{'addr':'No IP addr'}] )]
		if addresses[0] != '127.0.0.1' and addresses[0] != 'No IP addr':
			currentIp = addresses[0]
		#print ('%s: %s' % (ifaceName, ', '.join(addresses)))
	return currentIp


#https://stackoverflow.com/questions/50120102/python-http-server-keep-connection-alive
def start_http_server_in_new_thread(server_address,requestHandler):
	backend_server = http.server.ThreadingHTTPServer(server_address, requestHandler)
	context = get_ssl_context(certfile, keyfile)
	backend_server.socket = context.wrap_socket(backend_server.socket, server_side=True)
	f = lambda : backend_server.serve_forever()
	backend_thread = threading.Thread(target=f)
	backend_thread.daemon=True
	backend_thread.start()
	return backend_thread


backend_thread = None
webSocketSvrThread = None
stop = 0

####concurrent / thread for checking if interfaces / ip addresses have changed
def loopCheckIpHasChanged():
	global svrIp, backend_thread
	#webSocketSvrThread = 0
	while(1):
		currentIp = getIp()
		#print(currentIp)
		if currentIp != svrIp:
			print('ip has changed, need to rebind servers to new interface addresses')
			svrIp = currentIp
			
			#if backend_thread != None:
			#	backend_thread.stop() #no such function stop() use set_result signal below
			
			server_address = (svrIp, 8000)
			print( "starting httpAsyncServer at " + server_address[0] + " port " + str(server_address[1]) )
			backend_thread = start_http_server_in_new_thread(server_address, HTTPAsyncHandler)
			
			if stop != 0: #https://stackoverflow.com/questions/60113143/how-to-properly-use-asyncio-run-coroutine-threadsafe-function
				stop.get_loop().call_soon_threadsafe(stop.set_result, 1)
				#webSocketSvrThread.stop()#stop.set_result(1);
			loop = asyncio.new_event_loop()
			asyncio.set_event_loop(loop)
			loop = asyncio.get_event_loop()
			print('before run coroutine startWebsocketServer')
			
			#webSocketSvrThread = startWebsocketServer_in_new_thread()
			
		time.sleep(1)


#start_http_server_in_new_thread(("127.0.0.1",8000), HTTPAsyncHandler)
#while(1):
#	time.sleep(1)

#run the ip change checking loop (main program loop)
f = lambda : loopCheckIpHasChanged()
ipCheck_thread = threading.Thread(target=f)
#ipCheck_thread.daemon=True
ipCheck_thread.start()

