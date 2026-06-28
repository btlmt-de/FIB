scoreboard players set @s bm.armed 0
tellraw @s ["",{"text":"You trace the bearing... but the distance scrawled here runs clean off the edge of the page.","color":"gray","italic":true}]
tellraw @s {"text":"That land lies too far to chart from here. Sail away and try again.","color":"red"}
playsound minecraft:block.note_block.bass player @s ~ ~ ~ 0.6 0.6
