scoreboard players set @s bm.armed 0
tellraw @s {"text":"[Biome Locator] No matching biome within search range. Move to a different area and try again.","color":"red"}
playsound minecraft:block.note_block.bass player @s ~ ~ ~ 0.6 0.6
