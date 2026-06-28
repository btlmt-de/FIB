scoreboard players set @s bm.armed 0
tellraw @s {"text":"[Biome Locator] Couldn't get a precise fix (likely a biome edge). Move ~100 blocks and try again.","color":"yellow"}
playsound minecraft:block.note_block.bass player @s ~ ~ ~ 0.6 0.8
