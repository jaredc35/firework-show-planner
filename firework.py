"""
This module defines the Firework class, which represents a firework with various attributes.
It includes several properties, as well as functions to convert to dictionary format,
create a firework from a dictionary,
change properties, check if two fireworks are equal,
and solve for the required launch time

"""


class Firework:
    def __init__(
        self,
        id,
        name,
        firework_type,
        fuse_duration,
        air_travel_time,
        effect_time,
        effect_duration,
        cost=0,
    ):
        self.id = id
        self.name = name
        self.type = firework_type
        self.fuse_duration = fuse_duration
        self.air_travel_time = air_travel_time
        self.effect_duration = effect_duration
        self.effect_time = effect_time
        self.launch_time = effect_time - air_travel_time - fuse_duration
        self.cost = cost

    def from_dict(data):
        # Create a Firework instance from a dictionary
        if not isinstance(data, dict):
            raise ValueError("Input must be a dictionary")
        return Firework(
            id=data["id"],
            name=data["name"],
            firework_type=data["type"],
            fuse_duration=data["fuse_duration"],
            air_travel_time=data["air_travel_time"],
            effect_time=data["effect_time"],
            effect_duration=data["effect_duration"],
            cost=data.get("cost", 0),
        )

    def change_property(self, property_name, value):
        # Change a property of the Firework instance
        if hasattr(self, property_name):
            setattr(self, property_name, value)
            if property_name in ["fuse_duration", "air_travel_time", "effect_time"]:
                self.launch_time = (
                    self.effect_time - self.air_travel_time - self.fuse_duration
                )
        else:
            raise AttributeError(f"{property_name} is not a valid property of Firework")

    def __eq__(self, other):
        # Check if two Firework instances are equal
        if not isinstance(other, Firework):
            return False
        return (
            self.id == other.id
            and self.name == other.name
            and self.type == other.type
            and self.fuse_duration == other.fuse_duration
            and self.air_travel_time == other.air_travel_time
            and self.effect_time == other.effect_time
            and self.effect_duration == other.effect_duration
            and self.cost == other.cost
        )

    def to_dict(self):
        # Convert the Firework instance to a dictionary
        return self.__dict__
