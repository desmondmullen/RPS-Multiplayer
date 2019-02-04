# RPS-Multiplayer

***RPS-Multiplayer* lets you play Rock Paper Scissors with a friend or with a random person online.**

# Features
In addition to the basic function of the assignment, this app does the following:

### REALLY COOL BITS:
* The status of your opponent is always instantly updated with text and color cues - whether you are in the queue (red), waiting for an opponent to connect (light red), when an opponent has connected (yellow), or when your opponent has made their choice (green).
* Each player's location is shown on maps below the gameplay area giving an added dimension to the human-connection aspect of this multiplayer game.
* Players can send messages to each other while playing. Players can even use this as a chat application and think of the game as secondary.
* If two people are already using the game and others try to connect, they will be notified that "The queue of players is full. If you leave this browser tab open, we'll update you when it is your turn to play!". The red "waiting in queue" banner turns yellow when the player gets to the top of the queue and gets matched with another player.
* Fully functional and responsive on mobiles. Note: I learned the mobile emulator in Chrome displays some things *very* differently than on actual mobile phones. I could not get the positioning of a couple of divs perfect before the midnight deadline for this homework. Because mobile responsiveness was not required for this assignment, I thought it would be okay to take a few more hours to perfect it, so I did. And then I updated this Read Me. I didn't change any of the required bits after the deadline. (DSM,02/04/19 11am)
* Page reloads are properly handled making the reloaded page the last player in the queue. Internal data tracking of "player 1" and "player 2" are juggled automatically.