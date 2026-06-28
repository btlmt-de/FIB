advancement revoke @s only biome_map:consume/note_desert
execute store result score #now bm.work run time query gametime
scoreboard players operation #diff bm.work = #now bm.work
scoreboard players operation #diff bm.work -= @s bm.lastuse
execute if score #diff bm.work matches ..19 run return 0
scoreboard players operation @s bm.lastuse = #now bm.work
scoreboard players set @s bm.armed 1
scoreboard players set @s bm.fromnote 1
function biome_map:locate
