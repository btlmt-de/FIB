# Trilaterate the armed biome from the player's current position, then narrate it.
execute unless dimension minecraft:overworld run return run function biome_map:msg/wrong_dim

data remove storage biome_map:tmp cfg
execute if score @s bm.armed matches 1 run data modify storage biome_map:tmp cfg set value {biome:"minecraft:desert",flavor:"a vast desert of golden sand"}
execute if score @s bm.armed matches 2 run data modify storage biome_map:tmp cfg set value {biome:"minecraft:badlands",flavor:"the red-clay badlands"}
execute if score @s bm.armed matches 3 run data modify storage biome_map:tmp cfg set value {biome:"minecraft:warm_ocean",flavor:"warm, turquoise waters"}
execute if score @s bm.armed matches 4 run data modify storage biome_map:tmp cfg set value {biome:"minecraft:pale_garden",flavor:"a pale, mist-shrouded grove"}
execute unless data storage biome_map:tmp cfg run return run function biome_map:msg/out_of_range

execute store result storage biome_map:tmp x0 int 1 run data get entity @s Pos[0]
execute store result storage biome_map:tmp z0 int 1 run data get entity @s Pos[2]
data modify storage biome_map:tmp biome set from storage biome_map:tmp cfg.biome

data remove storage biome_map:tmp d0
data modify storage biome_map:tmp dx set value 0
data modify storage biome_map:tmp dz set value 0
data modify storage biome_map:tmp out set value "d0"
function biome_map:sample with storage biome_map:tmp
execute unless data storage biome_map:tmp d0 run return run function biome_map:msg/out_of_range

data remove storage biome_map:tmp d1
data modify storage biome_map:tmp dx set value 64
data modify storage biome_map:tmp dz set value 0
data modify storage biome_map:tmp out set value "d1"
function biome_map:sample with storage biome_map:tmp
execute unless data storage biome_map:tmp d1 run return run function biome_map:msg/out_of_range

data remove storage biome_map:tmp d2
data modify storage biome_map:tmp dx set value 0
data modify storage biome_map:tmp dz set value 64
data modify storage biome_map:tmp out set value "d2"
function biome_map:sample with storage biome_map:tmp
execute unless data storage biome_map:tmp d2 run return run function biome_map:msg/out_of_range

execute store result score #x bm.work run data get storage biome_map:tmp x0 1
execute store result score #z bm.work run data get storage biome_map:tmp z0 1
execute store result score #d0 bm.work run data get storage biome_map:tmp d0 1
scoreboard players operation #d0 bm.work *= #d0 bm.work
execute store result score #d1 bm.work run data get storage biome_map:tmp d1 1
scoreboard players operation #d1 bm.work *= #d1 bm.work
execute store result score #d2 bm.work run data get storage biome_map:tmp d2 1
scoreboard players operation #d2 bm.work *= #d2 bm.work
scoreboard players operation #dx bm.work = #c bm.work
scoreboard players operation #dx bm.work += #d0 bm.work
scoreboard players operation #dx bm.work -= #d1 bm.work
scoreboard players operation #dx bm.work /= #d bm.work
scoreboard players operation #x bm.work += #dx bm.work
scoreboard players operation #dz bm.work = #c bm.work
scoreboard players operation #dz bm.work += #d0 bm.work
scoreboard players operation #dz bm.work -= #d2 bm.work
scoreboard players operation #dz bm.work /= #d bm.work
scoreboard players operation #z bm.work += #dz bm.work
execute store result storage biome_map:tmp tx int 1 run scoreboard players get #x bm.work
execute store result storage biome_map:tmp tz int 1 run scoreboard players get #z bm.work

execute if score #debug bm.work matches 1 run tellraw @s [{"text":"[BM debug] target=","color":"aqua"},{"storage":"biome_map:tmp","nbt":"tx","color":"white"},{"text":","},{"storage":"biome_map:tmp","nbt":"tz","color":"white"}]

data remove storage biome_map:tmp vd
function biome_map:validate with storage biome_map:tmp
execute unless data storage biome_map:tmp vd run return run function biome_map:msg/inconsistent
execute store result score #vd bm.work run data get storage biome_map:tmp vd 1
execute if score #vd bm.work matches 512.. run return run function biome_map:msg/inconsistent

function biome_map:describe
