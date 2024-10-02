import asyncio
from websockets.server import serve
from enum import Enum
import queue
import time

class GameState(Enum):
	GatheringPlayers = 0
	InProgress       = 1
	Completed        = 2

openGames = queue.Queue()

inProgressGames = {}

class Game:
	def __init__(self):
		self.initTime   = time.time() #seconds since epoch
		self.svrUid     = 0
		self.maxPlayers = 0
		self.clients    = []
		self.status     = GameState.GatheringPlayers
	def toStr(self):
		cliStr = str( len(self.clients) ) + ","
		for cli in self.clients:
			cliStr += str(cli[1]) + ','
		return "game %s %i %s %i" % (self.svrUid, self.maxPlayers, cliStr, int(self.status.value))

async def NotifyGameClients( game, msgStr ):
	notifStr = "gmInf " + msgStr
	print( "notifying numClients %i %s" % (len(game.clients), msgStr) )
	idx = 0
	for client in game.clients:
		print( "client %i %i" % (idx, client[1]) ) 
		idx += 1
		try:
			print( "sending" )
			await client[0].send( notifStr )
		except Exception as e: #the client disconnected
			print("error sending status to %i excpt: %s" % (client[1],e) )
			try:
				game.clients.remove(client)
				print( "succesfully removed disconnected client %i" % client[1] )
			except Exception as e:
				print(e)
	print( "notify game clients end" )

"""add the client uid to the first avaliable open game
and notify the players
when the game is full move it to in progress games
return the game server uid for lookup
"""
async def clientJoinFirstOpenGame( clientWebsocket, clientUid ):
	statusStr = "clnt joined "
	try:
		opnGame = openGames.queue[0]
		opnGame.clients.append( [clientWebsocket, clientUid] ) #append to game players
		plrJoinedNotifStr = "joined %i %s" % ( clientUid, opnGame.toStr() )
		await NotifyGameClients( opnGame, plrJoinedNotifStr )
		if( len( opnGame.clients ) > opnGame.maxPlayers ):
			opnGame.status = GameState.InProgress
			openGames.get() #remove from queue
		statusStr += "%i %s" % ( clientUid, opnGame.toStr() )
	except IndexError:
		statusStr += "-1" #no openGames (games waiting for players)
	await clientWebsocket.send( statusStr )
	print( "clientJoinFirstOpenGame end" )



async def echo(websocket):
	async for message in websocket:
		print("rcvd msg: %s" % (message))
		msgParts = message.split(" ")
		nextIsNumPlayers = False
		clientUid = 0
		nextIsUid = False
		newGameState = None
		clientFoundGameSvrUid = -1
		if msgParts[0] == "clientStarted":
			clientLookingForGame = True
			clientUid = int(msgParts[2])
			await clientJoinFirstOpenGame( websocket, clientUid )
		elif msgParts[0] == "serverStarted":
			newGameState = Game()
			newGameState.svrUid = int(msgParts[4])
			newGameState.clients.append( [websocket, newGameState.svrUid] )
			newGameState.maxPlayers = int(msgParts[2])
			openGames.put( newGameState )
			inProgressGames.setdefault( newGameState.svrUid, newGameState )
			str = ( 'svr newGameSvrId %i %s' % 
				(newGameState.svrUid, 
				newGameState.toStr()) )
			print( str )
			await websocket.send( str )
		elif msgParts[0] == "svrStartGame":
			game = inProgressGames.get( int(msgParts[1]) )
			game.status =  GameState.InProgress
			startedNotifStr = "gameStarted"
			await NotifyGameClients(game, startedNotifStr)
	print("echo func end")

async def main():
	print("starting server")
	ip = ""
	port = 9999
	async with serve(echo, ip, port):
		print( "serving at %s port %i" % (ip, port) )
		await asyncio.get_running_loop().create_future()

asyncio.run(main())
