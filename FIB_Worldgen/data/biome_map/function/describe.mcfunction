# Turn (tx,tz) + player pos into a cardinal direction and a rounded distance
execute store result score #px bm.work run data get storage biome_map:tmp x0 1
execute store result score #pz bm.work run data get storage biome_map:tmp z0 1
execute store result score #tx bm.work run data get storage biome_map:tmp tx 1
execute store result score #tz bm.work run data get storage biome_map:tmp tz 1
scoreboard players operation #ddx bm.work = #tx bm.work
scoreboard players operation #ddx bm.work -= #px bm.work
scoreboard players operation #ddz bm.work = #tz bm.work
scoreboard players operation #ddz bm.work -= #pz bm.work

# |dx|, |dz|
scoreboard players operation #adx bm.work = #ddx bm.work
execute if score #adx bm.work matches ..-1 run scoreboard players operation #adx bm.work *= #neg1 bm.work
scoreboard players operation #adz bm.work = #ddz bm.work
execute if score #adz bm.work matches ..-1 run scoreboard players operation #adz bm.work *= #neg1 bm.work

# sector thresholds: pure E/W if adz*12 < adx*5 ; pure N/S if adx*12 < adz*5 ; else diagonal
scoreboard players operation #ew_l bm.work = #adz bm.work
scoreboard players operation #ew_l bm.work *= #12 bm.work
scoreboard players operation #ew_r bm.work = #adx bm.work
scoreboard players operation #ew_r bm.work *= #5 bm.work
scoreboard players operation #ns_l bm.work = #adx bm.work
scoreboard players operation #ns_l bm.work *= #12 bm.work
scoreboard players operation #ns_r bm.work = #adz bm.work
scoreboard players operation #ns_r bm.work *= #5 bm.work

data modify storage biome_map:tmp dir set value "an uncertain bearing"
# pure E/W
execute if score #ew_l bm.work < #ew_r bm.work if score #ddx bm.work matches 0.. run data modify storage biome_map:tmp dir set value "east"
execute if score #ew_l bm.work < #ew_r bm.work if score #ddx bm.work matches ..-1 run data modify storage biome_map:tmp dir set value "west"
# pure N/S
execute if score #ns_l bm.work < #ns_r bm.work if score #ddz bm.work matches 0.. run data modify storage biome_map:tmp dir set value "south"
execute if score #ns_l bm.work < #ns_r bm.work if score #ddz bm.work matches ..-1 run data modify storage biome_map:tmp dir set value "north"
# diagonal (neither pure)
execute if score #ew_l bm.work >= #ew_r bm.work if score #ns_l bm.work >= #ns_r bm.work if score #ddz bm.work matches 0.. if score #ddx bm.work matches 0.. run data modify storage biome_map:tmp dir set value "south-east"
execute if score #ew_l bm.work >= #ew_r bm.work if score #ns_l bm.work >= #ns_r bm.work if score #ddz bm.work matches 0.. if score #ddx bm.work matches ..-1 run data modify storage biome_map:tmp dir set value "south-west"
execute if score #ew_l bm.work >= #ew_r bm.work if score #ns_l bm.work >= #ns_r bm.work if score #ddz bm.work matches ..-1 if score #ddx bm.work matches 0.. run data modify storage biome_map:tmp dir set value "north-east"
execute if score #ew_l bm.work >= #ew_r bm.work if score #ns_l bm.work >= #ns_r bm.work if score #ddz bm.work matches ..-1 if score #ddx bm.work matches ..-1 run data modify storage biome_map:tmp dir set value "north-west"

# distance rounded to nearest 100
execute store result score #dist bm.work run data get storage biome_map:tmp d0 1
scoreboard players add #dist bm.work 50
scoreboard players operation #dist bm.work /= #100 bm.work
scoreboard players operation #dist bm.work *= #100 bm.work
execute store result storage biome_map:tmp dist int 1 run scoreboard players get #dist bm.work
function biome_map:pick_flavor

tellraw @s ["",{"text":"You unfold the brittle note. The faded ink reads:","color":"gray","italic":true}]
tellraw @s ["",{"text":"  \u201cHold yer heading ","color":"yellow"},{"storage":"biome_map:tmp","nbt":"dir","color":"gold","bold":true},{"text":" near on ","color":"yellow"},{"storage":"biome_map:tmp","nbt":"dist","color":"gold","bold":true},{"text":" paces, an' ye'll come upon ","color":"yellow"},{"storage":"biome_map:tmp","nbt":"flavor","color":"gold"},{"text":". Whether 'tis worth the walk, only ye can say.\u201d","color":"yellow"}]
execute at @s run particle minecraft:enchant ~ ~1 ~ 0.3 0.4 0.3 0.05 10
playsound minecraft:item.book.page_turn player @s ~ ~ ~ 1 1

# One-time use: if this was triggered by reading a note, consume it
execute if score @s bm.fromnote matches 1 run function biome_map:consume_note
scoreboard players set @s bm.fromnote 0
