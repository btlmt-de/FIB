tellraw @s ["",{"text":"The brittle paper crumbles to dust in your fingers.","color":"dark_gray","italic":true}]
execute at @s run particle minecraft:ash ~ ~1 ~ 0.2 0.25 0.2 0.01 18
playsound minecraft:block.grass.break player @s ~ ~ ~ 0.6 1.5
execute if score @s bm.armed matches 1 run clear @s minecraft:paper[minecraft:custom_data~{bm_note:1b}] 1
execute if score @s bm.armed matches 2 run clear @s minecraft:paper[minecraft:custom_data~{bm_note:2b}] 1
execute if score @s bm.armed matches 3 run clear @s minecraft:paper[minecraft:custom_data~{bm_note:3b}] 1
execute if score @s bm.armed matches 4 run clear @s minecraft:paper[minecraft:custom_data~{bm_note:4b}] 1
execute if score @s bm.armed matches 5 run clear @s minecraft:paper[minecraft:custom_data~{bm_note:5b}] 1
