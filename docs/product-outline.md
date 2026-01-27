# Party Game

# Overview

The point of the game is that a topic is given like "Name a country that has j in its name" and the contestants have to each give unique answers. If people give duplicate answers, those people get no points. Otherwise you get points. The system also chooses an answer itself and contributes to the answer pool. The game continues with these rounds with a new topic each round

Note:

- Topics should be chosen such that either:
    - The pool of existing answers for it is limited. Eg countries that have a J in their name or countries that have stars in their flag
    - The pool of **common** answers is quite small - leading to high chance of overlap. Eg names of influencial mathemeticians
    - Each question shows the # of possible answers
- Themes can be selected for games like Geography, Pop culture, TV/Movies, etc
- Rounds have time limits, customizable

# User Flow

1. Main menu
    1. Select name, avatar
    2. Play → This joins you to random lobby (Can join mid game)
        1. Later we can make a lobby list filterable by themes
    3. Private → Create/Enter Code
        1. Host can choose themes (can be all), and set round speed magnifier (0.5x → 2x) 
        2. They can also choose whether to play with the bot (default 1 bot) - can add many bots
2. Room lobby
    1. Waiting for players…
    2. When playercount hits 2 the host has option to start
    3. Host can copy invite link
3. Round
    1. Game starting countdown 3, 2, 1
    2. A question from theme pool gets selected. Should have #answers ≥ #alive players. Follow question selection algorithm
    3. User answers in box
        1. Submit → Keeps answer. Sidebar shows who has submitted
        2. Modify → modify your answer
    4. Auto submits if they havent submitted in time
4. Between rounds
    1. Shows everyone’s answer along with whether it is correct or not. The bot also contributes to the answer pool if its enabled
    2. If two people have the same answer then they are disqualified. This does make ties possible

## Bot

- For now lets have it choose random answer. WIll test if its better if it chooses what it believes to be the **most common** answer

## Question selection algorithm

- First exclude all questions that have #answers < #alive players
- For the other questions, select based on a normal distribution centered around 6x(#players)
- As the rounds go on, gradually center the mean closer and closer towards 2x(#players
[https://excalidraw.com/#json=gPyrBuidS0PL5RAGrN74v,9W1KE07SYF9XmCKo4P8wcA](https://excalidraw.com/#json=gPyrBuidS0PL5RAGrN74v,9W1KE07SYF9XmCKo4P8wcA)

[https://www.notion.so](https://www.notion.so)

![Screenshot 2026-01-25 at 11.54.06 AM.png](Party%20Game/Screenshot_2026-01-25_at_11.54.06_AM.png)

![Screenshot 2026-01-25 at 11.58.09 AM.png](Party%20Game/Screenshot_2026-01-25_at_11.58.09_AM.png)

# Technical Details

[Party Game Technical Outline](https://www.notion.so/Party-Game-Technical-Outline-2f3ec43738368036ba9fd541aa5911c9?pvs=21)

[Generating questions](https://www.notion.so/Generating-questions-2f3ec43738368047b12bc4c46dd1a064?pvs=21)

# Similar Games

- StopoutS: online version of Scattegories where you try to fill in as many cards as possible by words starting with a letter [https://onrizon.com/en/products/stopots](https://onrizon.com/en/products/stopots)