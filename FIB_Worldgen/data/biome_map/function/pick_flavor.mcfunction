# Variety for biome desciprtions
execute store result score #v bm.work run random value 1..3

execute if score @s bm.armed matches 1 if score #v bm.work matches 1 run data modify storage biome_map:tmp flavor set value "a vast desert of golden sand"
execute if score @s bm.armed matches 1 if score #v bm.work matches 2 run data modify storage biome_map:tmp flavor set value "a sea of dunes where no water runs"
execute if score @s bm.armed matches 1 if score #v bm.work matches 3 run data modify storage biome_map:tmp flavor set value "sun-bleached wastes of endless sand"

execute if score @s bm.armed matches 2 if score #v bm.work matches 1 run data modify storage biome_map:tmp flavor set value "the red-clay badlands"
execute if score @s bm.armed matches 2 if score #v bm.work matches 2 run data modify storage biome_map:tmp flavor set value "broken hills streaked with rust and clay"
execute if score @s bm.armed matches 2 if score #v bm.work matches 3 run data modify storage biome_map:tmp flavor set value "a maze of crimson mesas"

execute if score @s bm.armed matches 3 if score #v bm.work matches 1 run data modify storage biome_map:tmp flavor set value "warm, turquoise waters"
execute if score @s bm.armed matches 3 if score #v bm.work matches 2 run data modify storage biome_map:tmp flavor set value "a shallow sea the colour of jade"
execute if score @s bm.armed matches 3 if score #v bm.work matches 3 run data modify storage biome_map:tmp flavor set value "bright reefs beneath a warm tide"

execute if score @s bm.armed matches 4 if score #v bm.work matches 1 run data modify storage biome_map:tmp flavor set value "a pale, mist-shrouded grove"
execute if score @s bm.armed matches 4 if score #v bm.work matches 2 run data modify storage biome_map:tmp flavor set value "a forest drained of all colour"
execute if score @s bm.armed matches 4 if score #v bm.work matches 3 run data modify storage biome_map:tmp flavor set value "ghostly woods where the leaves hang grey"

execute if score @s bm.armed matches 5 if score #v bm.work matches 1 run data modify storage biome_map:tmp flavor set value "a grove of pink cherry blossoms"
execute if score @s bm.armed matches 5 if score #v bm.work matches 2 run data modify storage biome_map:tmp flavor set value "hills awash in falling pink petals"
execute if score @s bm.armed matches 5 if score #v bm.work matches 3 run data modify storage biome_map:tmp flavor set value "a blush-coloured wood in eternal bloom"

# safety net so the line is never blank
execute unless data storage biome_map:tmp flavor run data modify storage biome_map:tmp flavor set value "distant lands"
