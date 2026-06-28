tellraw @s ["",{"text":"The brittle paper crumbles to dust in your fingers.","color":"dark_gray","italic":true}]
execute if score @s bm.armed matches 1 run clear @s minecraft:paper[minecraft:custom_data~{bm_note:1b}] 1
execute if score @s bm.armed matches 2 run clear @s minecraft:paper[minecraft:custom_data~{bm_note:2b}] 1
execute if score @s bm.armed matches 3 run clear @s minecraft:paper[minecraft:custom_data~{bm_note:3b}] 1
execute if score @s bm.armed matches 4 run clear @s minecraft:paper[minecraft:custom_data~{bm_note:4b}] 1
execute if score @s bm.armed matches 5 run clear @s minecraft:paper[minecraft:custom_data~{bm_note:5b}] 1
