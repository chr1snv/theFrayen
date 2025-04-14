
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


start_http_server_in_new_thread(("127.0.0.1",8000), HTTPAsyncHandler)
while(1):
	time.sleep(1)

