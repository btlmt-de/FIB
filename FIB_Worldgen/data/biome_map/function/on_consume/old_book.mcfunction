advancement revoke @s only biome_map:consume/old_book
execute store result score #now bm.work run time query gametime
scoreboard players operation #diff bm.work = #now bm.work
scoreboard players operation #diff bm.work -= @s bm.lastuse
execute if score #diff bm.work matches ..19 run return 0
scoreboard players operation @s bm.lastuse = #now bm.work

execute store result score @s bm.armed run random value 1..5
tellraw @s ["",{"text":"The journal\u2019s spine cracks as you pry it open. Most pages are pulped\u2026","color":"gray","italic":true}]
tellraw @s ["",{"text":"\u2026but a folded note slips loose from the binding.","color":"gray","italic":true}]
execute at @s run particle minecraft:poof ~ ~1.2 ~ 0.25 0.3 0.25 0.01 12
playsound minecraft:block.wood.break player @s ~ ~ ~ 0.4 0.6
playsound minecraft:item.book.page_turn player @s ~ ~ ~ 1 0.7
function biome_map:give_paper
clear @s minecraft:torchflower[minecraft:custom_data~{bm_is_oldbook:1b}] 1
