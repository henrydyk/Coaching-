--[[
	MapBuilder – Roblox Studio Plugin
	Du tippst z.B. "baue eine 1vs1 map" und das Plugin baut die Map in Workspace.

	Installation: siehe README.md im Repo.
	Das Plugin braucht KEINEN Server und KEINEN API-Key – alles läuft lokal in Studio.

	Unterstützte Begriffe im Text:
	  Map-Typen:  1v1 / 1vs1, ffa / 4 spieler, obby / parkour, spleef
	  Formen:     rund / kreis  (runde Arena statt eckiger)
	  Größen:     klein, groß / gross
	  Themes:     lava, eis / ice, wald / forest, weltraum / space
]]

local ChangeHistoryService = game:GetService("ChangeHistoryService")

----------------------------------------------------------------
-- Themes (Farben + Materialien)
----------------------------------------------------------------

local THEMES = {
	standard = {
		floor = { color = Color3.fromRGB(120, 120, 125), material = Enum.Material.SmoothPlastic },
		wall = { color = Color3.fromRGB(90, 90, 95), material = Enum.Material.Concrete },
		accent = { color = Color3.fromRGB(255, 170, 0), material = Enum.Material.Neon },
		deco = { color = Color3.fromRGB(200, 200, 205), material = Enum.Material.Marble },
	},
	lava = {
		floor = { color = Color3.fromRGB(60, 50, 50), material = Enum.Material.Basalt },
		wall = { color = Color3.fromRGB(45, 35, 35), material = Enum.Material.Rock },
		accent = { color = Color3.fromRGB(255, 80, 0), material = Enum.Material.Neon },
		deco = { color = Color3.fromRGB(90, 60, 50), material = Enum.Material.CrackedLava },
	},
	eis = {
		floor = { color = Color3.fromRGB(180, 220, 255), material = Enum.Material.Ice },
		wall = { color = Color3.fromRGB(140, 190, 240), material = Enum.Material.Glacier },
		accent = { color = Color3.fromRGB(0, 200, 255), material = Enum.Material.Neon },
		deco = { color = Color3.fromRGB(220, 240, 255), material = Enum.Material.Ice },
	},
	wald = {
		floor = { color = Color3.fromRGB(80, 130, 60), material = Enum.Material.Grass },
		wall = { color = Color3.fromRGB(100, 75, 50), material = Enum.Material.Wood },
		accent = { color = Color3.fromRGB(160, 255, 90), material = Enum.Material.Neon },
		deco = { color = Color3.fromRGB(60, 100, 45), material = Enum.Material.LeafyGrass },
	},
	space = {
		floor = { color = Color3.fromRGB(40, 40, 60), material = Enum.Material.Metal },
		wall = { color = Color3.fromRGB(25, 25, 40), material = Enum.Material.DiamondPlate },
		accent = { color = Color3.fromRGB(140, 80, 255), material = Enum.Material.Neon },
		deco = { color = Color3.fromRGB(90, 90, 130), material = Enum.Material.Foil },
	},
}

----------------------------------------------------------------
-- Bau-Helfer (hier entstehen auch die RUNDEN Formen)
----------------------------------------------------------------

local function basePart(parent, style)
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Color = style.color
	p.Material = style.material
	p.Parent = parent
	return p
end

-- Eckiger Block
local function makeBlock(parent, style, size, cframe)
	local p = basePart(parent, style)
	p.Size = size
	p.CFrame = cframe
	return p
end

-- Zylinder (runde Säule / runde Plattform)
-- Roblox-Zylinder liegen auf der Seite, deshalb drehen wir sie um 90 Grad.
local function makeCylinder(parent, style, diameter, height, cframe)
	local p = basePart(parent, style)
	p.Shape = Enum.PartType.Cylinder
	p.Size = Vector3.new(height, diameter, diameter)
	p.CFrame = cframe * CFrame.Angles(0, 0, math.rad(90))
	return p
end

-- Kugel
local function makeSphere(parent, style, diameter, cframe)
	local p = basePart(parent, style)
	p.Shape = Enum.PartType.Ball
	p.Size = Vector3.new(diameter, diameter, diameter)
	p.CFrame = cframe
	return p
end

-- Schräge (Rampe)
local function makeWedge(parent, style, size, cframe)
	local p = Instance.new("WedgePart")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Color = style.color
	p.Material = style.material
	p.Size = size
	p.CFrame = cframe
	p.Parent = parent
	return p
end

-- Runde Mauer: viele kurze Segmente im Kreis -> sieht rund aus
local function makeRoundWall(parent, style, center, radius, height, thickness, segments, gapAngles)
	gapAngles = gapAngles or {}
	for i = 0, segments - 1 do
		local angle = (i / segments) * math.pi * 2
		local skip = false
		for _, gap in ipairs(gapAngles) do
			local diff = math.abs(math.atan2(math.sin(angle - gap.at), math.cos(angle - gap.at)))
			if diff < gap.width then
				skip = true
				break
			end
		end
		if not skip then
			local segLength = 2 * math.pi * radius / segments + 0.6
			local pos = center + Vector3.new(math.cos(angle) * radius, height / 2, math.sin(angle) * radius)
			makeBlock(parent, style, Vector3.new(thickness, height, segLength),
				CFrame.new(pos) * CFrame.Angles(0, -angle, 0))
		end
	end
end

-- Torbogen: zwei runde Säulen + Bogen aus gedrehten Segmenten
local function makeArch(parent, pillarStyle, archStyle, baseCFrame, width, height)
	local halfW = width / 2
	makeCylinder(parent, pillarStyle, 2, height, baseCFrame * CFrame.new(-halfW, height / 2, 0))
	makeCylinder(parent, pillarStyle, 2, height, baseCFrame * CFrame.new(halfW, height / 2, 0))

	local segments = 9
	local archRadius = halfW
	for i = 0, segments - 1 do
		local a0 = (i / segments) * math.pi
		local a1 = ((i + 1) / segments) * math.pi
		local mid = (a0 + a1) / 2
		local segLen = archRadius * (a1 - a0) + 0.4
		local pos = baseCFrame * CFrame.new(math.cos(mid) * archRadius, height + math.sin(mid) * archRadius * 0.6, 0)
		local part = makeBlock(parent, archStyle, Vector3.new(segLen, 1.4, 2), pos)
		part.CFrame = CFrame.new(pos.Position) * baseCFrame.Rotation * CFrame.Angles(0, 0, mid + math.pi / 2)
	end
end

-- Kuppel: gestapelte, immer kleinere Zylinder -> runde Kuppel-Optik
local function makeDome(parent, style, center, radius, layers)
	for i = 1, layers do
		local t = i / layers
		local layerRadius = radius * math.sqrt(1 - t * t)
		local y = center.Y + radius * t * 0.6
		if layerRadius > 1 then
			makeCylinder(parent, style, layerRadius * 2, radius * 0.6 / layers + 0.2,
				CFrame.new(center.X, y, center.Z))
		end
	end
	makeSphere(parent, style, radius * 0.5, CFrame.new(center.X, center.Y + radius * 0.65, center.Z))
end

local function makeSpawn(parent, cframe)
	local s = Instance.new("SpawnLocation")
	s.Anchored = true
	s.Size = Vector3.new(6, 1, 6)
	s.CFrame = cframe
	s.Neutral = true
	s.Duration = 0
	s.TopSurface = Enum.SurfaceType.Smooth
	s.Parent = parent
	return s
end

----------------------------------------------------------------
-- Map-Generatoren
----------------------------------------------------------------

local function buildArena(model, theme, opts)
	local size = opts.size -- Grundmaß
	local round = opts.round
	local playerCount = opts.players or 2

	if round then
		-- Runder Arenaboden aus einem großen Zylinder
		makeCylinder(model, theme.floor, size * 2, 2, CFrame.new(0, -1, 0))
		-- Akzentring außen
		makeCylinder(model, theme.accent, size * 2 + 3, 0.6, CFrame.new(0, 0.1, 0))
		makeCylinder(model, theme.floor, size * 2 - 1, 0.8, CFrame.new(0, 0.2, 0))
		-- Runde Mauer mit Lücken bei den Spawns
		local gaps = {}
		for i = 0, playerCount - 1 do
			table.insert(gaps, { at = (i / playerCount) * math.pi * 2, width = 0.22 })
		end
		makeRoundWall(model, theme.wall, Vector3.new(0, 0, 0), size, 10, 2, 40, gaps)
	else
		makeBlock(model, theme.floor, Vector3.new(size * 2, 2, size * 2), CFrame.new(0, -1, 0))
		-- Vier Mauern
		for _, w in ipairs({
			{ Vector3.new(0, 5, -size), Vector3.new(size * 2 + 2, 10, 2) },
			{ Vector3.new(0, 5, size), Vector3.new(size * 2 + 2, 10, 2) },
			{ Vector3.new(-size, 5, 0), Vector3.new(2, 10, size * 2 + 2) },
			{ Vector3.new(size, 5, 0), Vector3.new(2, 10, size * 2 + 2) },
		}) do
			makeBlock(model, theme.wall, w[2], CFrame.new(w[1]))
		end
		-- Runde Ecksäulen mit Kugeln obendrauf (damit es nicht nur Blöcke sind)
		for _, corner in ipairs({ { -1, -1 }, { -1, 1 }, { 1, -1 }, { 1, 1 } }) do
			local x, z = corner[1] * size, corner[2] * size
			makeCylinder(model, theme.deco, 4, 14, CFrame.new(x, 7, z))
			makeSphere(model, theme.accent, 4, CFrame.new(x, 15.5, z))
		end
	end

	-- Spawns im Kreis verteilt, jeweils mit Torbogen davor
	for i = 0, playerCount - 1 do
		local angle = (i / playerCount) * math.pi * 2
		local dir = Vector3.new(math.cos(angle), 0, math.sin(angle))
		local spawnPos = dir * (size - 8)
		makeSpawn(model, CFrame.new(spawnPos + Vector3.new(0, 0.5, 0)))
		local lookAtCenter = CFrame.lookAt(spawnPos + Vector3.new(0, 0, 0), Vector3.new(0, 0, 0))
		makeArch(model, theme.deco, theme.accent, lookAtCenter * CFrame.new(0, 0, -5), 10, 9)
	end

	-- Mitte: rundes Podest + schwebende Kugel
	makeCylinder(model, theme.deco, 10, 1.5, CFrame.new(0, 0.75, 0))
	makeCylinder(model, theme.accent, 11, 0.4, CFrame.new(0, 0.2, 0))
	makeSphere(model, theme.accent, 3, CFrame.new(0, 6, 0))

	-- Deckung: je Spieler zwei runde Säulen + eine Rampe
	for i = 0, playerCount - 1 do
		local angle = (i / playerCount) * math.pi * 2 + math.pi / playerCount
		local dir = Vector3.new(math.cos(angle), 0, math.sin(angle))
		local p1 = dir * (size * 0.5)
		makeCylinder(model, theme.wall, 5, 7, CFrame.new(p1.X, 3.5, p1.Z))
		makeSphere(model, theme.deco, 5, CFrame.new(p1.X, 8, p1.Z))
		local p2 = dir * (size * 0.3)
		makeWedge(model, theme.deco, Vector3.new(6, 4, 8),
			CFrame.lookAt(Vector3.new(p2.X, 2, p2.Z), Vector3.new(0, 2, 0)))
	end
end

local function buildObby(model, theme, opts)
	local length = opts.size -- wird als Länge benutzt
	-- Startplattform (rund!)
	makeCylinder(model, theme.floor, 16, 2, CFrame.new(0, -1, 0))
	makeSpawn(model, CFrame.new(0, 0.5, 0))
	makeArch(model, theme.deco, theme.accent, CFrame.new(0, 0, -6), 10, 8)

	local rng = Random.new(42)
	local z = -14
	local y = 0
	local x = 0
	local steps = math.clamp(math.floor(length / 6), 8, 30)

	for i = 1, steps do
		local kind = i % 4
		if kind == 0 then
			-- Runde Sprung-Plattform (Zylinder)
			makeCylinder(model, theme.deco, 6, 1.2, CFrame.new(x, y, z))
		elseif kind == 1 then
			-- Normale Plattform mit Akzentrand
			makeBlock(model, theme.floor, Vector3.new(6, 1.2, 6), CFrame.new(x, y, z))
			makeBlock(model, theme.accent, Vector3.new(6.6, 0.4, 6.6), CFrame.new(x, y - 0.5, z))
		elseif kind == 2 then
			-- Kugel zum Drüberspringen
			makeSphere(model, theme.deco, 5, CFrame.new(x, y - 1, z))
		else
			-- Rampe nach oben
			makeWedge(model, theme.floor, Vector3.new(6, 3, 8),
				CFrame.new(x, y + 1.5, z) * CFrame.Angles(0, math.pi, 0))
			y += 3
		end
		z -= rng:NextInteger(7, 10)
		x += rng:NextInteger(-4, 4)
		if i % 5 == 0 then
			-- Checkpoint: runde Plattform mit Spawn
			makeCylinder(model, theme.accent, 10, 1.5, CFrame.new(x, y - 0.2, z))
			makeSpawn(model, CFrame.new(x, y + 0.9, z))
			z -= 9
		end
	end

	-- Ziel: runde Plattform mit Kuppel
	makeCylinder(model, theme.floor, 20, 2, CFrame.new(x, y - 1, z - 6))
	makeDome(model, theme.accent, Vector3.new(x, y, z - 6), 10, 6)
end

local function buildSpleef(model, theme, opts)
	local radius = opts.size
	-- Runde Plattform aus vielen kleinen Platten (die kann man später zerstörbar machen)
	local tile = 4
	for gx = -radius, radius, tile do
		for gz = -radius, radius, tile do
			if math.sqrt(gx * gx + gz * gz) <= radius then
				local p = makeBlock(model, theme.floor, Vector3.new(tile - 0.3, 1, tile - 0.3),
					CFrame.new(gx, 20, gz))
				p.Name = "SpleefTile"
			end
		end
	end
	-- Akzentring + Spawns oben, Lava/Boden unten
	makeRoundWall(model, theme.accent, Vector3.new(0, 20, 0), radius + 3, 3, 1, 36)
	for i = 0, 3 do
		local angle = (i / 4) * math.pi * 2
		makeSpawn(model, CFrame.new(math.cos(angle) * (radius - 4), 21.5, math.sin(angle) * (radius - 4)))
	end
	local lavaStyle = { color = Color3.fromRGB(255, 80, 0), material = Enum.Material.Neon }
	makeCylinder(model, lavaStyle, radius * 2 + 14, 1, CFrame.new(0, 0, 0))
end

----------------------------------------------------------------
-- Text-Parser: versteht deine Eingabe
----------------------------------------------------------------

local function parsePrompt(text)
	local t = string.lower(text)
	local opts = {
		kind = "arena",
		players = 2,
		size = 40,
		round = false,
		theme = THEMES.standard,
		themeName = "standard",
	}

	if t:find("obby") or t:find("parkour") or t:find("parcour") then
		opts.kind = "obby"
		opts.size = 120
	elseif t:find("spleef") then
		opts.kind = "spleef"
		opts.size = 24
	end

	if t:find("1v1") or t:find("1vs1") or t:find("1 vs 1") or t:find("1 v 1") then
		opts.players = 2
	elseif t:find("ffa") or t:find("4 spieler") or t:find("2v2") or t:find("2vs2") then
		opts.players = 4
	end

	if t:find("rund") or t:find("kreis") or t:find("circle") then
		opts.round = true
	end

	if t:find("klein") then
		opts.size = math.floor(opts.size * 0.6)
	elseif t:find("groß") or t:find("gross") or t:find("riesig") or t:find("big") then
		opts.size = math.floor(opts.size * 1.6)
	end

	for name, theme in pairs(THEMES) do
		if t:find(name) then
			opts.theme = theme
			opts.themeName = name
		end
	end
	if t:find("ice") then opts.theme = THEMES.eis; opts.themeName = "eis" end
	if t:find("forest") then opts.theme = THEMES.wald; opts.themeName = "wald" end
	if t:find("weltraum") then opts.theme = THEMES.space; opts.themeName = "space" end
	if t:find("feuer") then opts.theme = THEMES.lava; opts.themeName = "lava" end

	return opts
end

local function buildMap(promptText)
	local opts = parsePrompt(promptText)

	local model = Instance.new("Model")
	model.Name = "MapBuilder: " .. promptText:sub(1, 40)
	model.Parent = workspace

	if opts.kind == "obby" then
		buildObby(model, opts.theme, opts)
	elseif opts.kind == "spleef" then
		buildSpleef(model, opts.theme, opts)
	else
		buildArena(model, opts.theme, opts)
	end

	return model, opts
end

----------------------------------------------------------------
-- Plugin-GUI
----------------------------------------------------------------

local toolbar = plugin:CreateToolbar("MapBuilder")
local button = toolbar:CreateButton("MapBuilder", "Map aus Text bauen", "rbxassetid://4458901886")

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Float, false, false, 340, 220, 300, 180
)
local widget = plugin:CreateDockWidgetPluginGui("MapBuilderWidget", widgetInfo)
widget.Title = "MapBuilder – Map aus Text"

local frame = Instance.new("Frame")
frame.Size = UDim2.fromScale(1, 1)
frame.BackgroundColor3 = Color3.fromRGB(40, 40, 45)
frame.Parent = widget

local info = Instance.new("TextLabel")
info.Size = UDim2.new(1, -20, 0, 40)
info.Position = UDim2.new(0, 10, 0, 8)
info.BackgroundTransparency = 1
info.TextColor3 = Color3.fromRGB(200, 200, 205)
info.TextWrapped = true
info.TextXAlignment = Enum.TextXAlignment.Left
info.Font = Enum.Font.Gotham
info.TextSize = 13
info.Text = "Beschreibe deine Map, z.B.:\n\"baue eine runde 1vs1 lava map\" oder \"großer eis obby\""
info.Parent = frame

local input = Instance.new("TextBox")
input.Size = UDim2.new(1, -20, 0, 56)
input.Position = UDim2.new(0, 10, 0, 54)
input.BackgroundColor3 = Color3.fromRGB(25, 25, 30)
input.TextColor3 = Color3.fromRGB(240, 240, 240)
input.PlaceholderText = "z.B. baue eine 1vs1 map"
input.PlaceholderColor3 = Color3.fromRGB(120, 120, 130)
input.TextWrapped = true
input.ClearTextOnFocus = false
input.Font = Enum.Font.Gotham
input.TextSize = 15
input.Text = ""
input.Parent = frame
local inputCorner = Instance.new("UICorner")
inputCorner.CornerRadius = UDim.new(0, 6)
inputCorner.Parent = input

local buildBtn = Instance.new("TextButton")
buildBtn.Size = UDim2.new(1, -20, 0, 36)
buildBtn.Position = UDim2.new(0, 10, 0, 120)
buildBtn.BackgroundColor3 = Color3.fromRGB(0, 162, 255)
buildBtn.TextColor3 = Color3.new(1, 1, 1)
buildBtn.Font = Enum.Font.GothamBold
buildBtn.TextSize = 16
buildBtn.Text = "Bauen!"
buildBtn.Parent = frame
local btnCorner = Instance.new("UICorner")
btnCorner.CornerRadius = UDim.new(0, 6)
btnCorner.Parent = buildBtn

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, -20, 0, 40)
status.Position = UDim2.new(0, 10, 0, 162)
status.BackgroundTransparency = 1
status.TextColor3 = Color3.fromRGB(150, 220, 150)
status.TextWrapped = true
status.TextXAlignment = Enum.TextXAlignment.Left
status.Font = Enum.Font.Gotham
status.TextSize = 13
status.Text = ""
status.Parent = frame

local function onBuild()
	local text = input.Text
	if text == "" then
		status.TextColor3 = Color3.fromRGB(255, 150, 150)
		status.Text = "Bitte erst beschreiben, was ich bauen soll."
		return
	end
	local recording = ChangeHistoryService:TryBeginRecording("MapBuilder", "Map bauen")
	local ok, result, opts = pcall(buildMap, text)
	if recording then
		ChangeHistoryService:FinishRecording(recording,
			ok and Enum.FinishRecordingOperation.Commit or Enum.FinishRecordingOperation.Cancel)
	end
	if ok then
		status.TextColor3 = Color3.fromRGB(150, 220, 150)
		status.Text = ("Fertig! Typ: %s, Theme: %s. Rückgängig mit Strg+Z."):format(opts.kind, opts.themeName)
	else
		status.TextColor3 = Color3.fromRGB(255, 150, 150)
		status.Text = "Fehler: " .. tostring(result)
		warn("[MapBuilder] " .. tostring(result))
	end
end

buildBtn.MouseButton1Click:Connect(onBuild)

input.FocusLost:Connect(function(enterPressed)
	if enterPressed then
		onBuild()
	end
end)

button.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)
